"""Operator-only PostgreSQL logical backup helper.
Run on a trusted operator machine, never from the public web application.
The destination must be on an already encrypted private volume.
No network-policy changes or restore operations are performed here.
"""
import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import tempfile

def sha256(path):
    digest=hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda:handle.read(1024*1024),b""):
            digest.update(block)
    return digest.hexdigest()

def checksum_path(path):
    return path.with_name(path.name+".sha256")

def toc(path):
    subprocess.run(["pg_restore","--list",str(path)],check=True,
                   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def verify(path):
    expected=checksum_path(path).read_text(encoding="ascii").strip()
    if len(expected)!=64 or sha256(path)!=expected:
        raise ValueError("Backup checksum mismatch.")
    toc(path)

def backup(path):
    if not path.is_absolute() or not path.parent.is_dir():
        raise ValueError("Choose an absolute existing private encrypted directory.")
    if path.exists() or checksum_path(path).exists():
        raise ValueError("Backup or checksum already exists; refusing overwrite.")
    if os.environ.get("PGSSLMODE")!="verify-full":
        raise ValueError("PGSSLMODE=verify-full is required.")
    if not all(os.environ.get(k) for k in ("PGHOST","PGDATABASE","PGUSER")):
        raise ValueError("Configure approved connection using libpq environment settings.")
    # No connection URI or password is passed as an argument or printed.
    # pg_dump prompts if no protected libpq credential file is available.
    os.umask(0o077)
    fd,tmp=tempfile.mkstemp(prefix=".unsigned-",suffix=".dump",dir=path.parent)
    os.close(fd)
    tmp=Path(tmp)
    created=False
    try:
        subprocess.run(["pg_dump","--format=custom","--no-owner","--no-privileges","--file",str(tmp)],check=True)
        if tmp.stat().st_size==0:
            raise ValueError("Empty backup.")
        toc(tmp)
        digest=sha256(tmp)
        # Exclusive creation: avoid overwriting even if another run races.
        os.link(tmp,path)
        created=True
        with checksum_path(path).open("x",encoding="ascii") as out:
            out.write(digest+"\n")
    except Exception:
        if created:path.unlink(missing_ok=True)
        raise
    finally:
        tmp.unlink(missing_ok=True)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation",choices=("backup","verify"))
    parser.add_argument("path",type=Path)
    args=parser.parse_args()
    try:
        if args.operation=="backup":backup(args.path)
        verify(args.path)
    except (OSError,ValueError,subprocess.CalledProcessError):
        parser.exit(1,"Backup or verification failed. Check local configuration privately.\n")
    print("Backup checksum and archive table-of-contents verified.")

if __name__=="__main__":main()
