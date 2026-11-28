"""Offline tests: never contact a database or use real credentials."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import backup_operator as B

class BackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path=Path(self.tmp.name)/"test.dump"
        self.env={"PGHOST":"example.invalid","PGDATABASE":"synthetic","PGUSER":"synthetic","PGSSLMODE":"verify-full"}
    def fake_run(self,args,**kwargs):
        if args[0]=="pg_dump":
            Path(args[args.index("--file")+1]).write_bytes(b"synthetic archive")
        elif args[0]!="pg_restore":
            raise AssertionError("unexpected command")
    def test_backup_verify_and_no_overwrite(self):
        with patch.dict(os.environ,self.env,clear=True),patch.object(B.subprocess,"run",side_effect=self.fake_run):
            B.backup(self.path)
            B.verify(self.path)
            self.assertEqual(self.path.read_bytes(),b"synthetic archive")
            with self.assertRaises(ValueError):B.backup(self.path)
            self.path.write_bytes(b"modified")
            with self.assertRaises(ValueError):B.verify(self.path)
    def test_tls_guard(self):
        with patch.dict(os.environ,{**self.env,"PGSSLMODE":"require"},clear=True),patch.object(B.subprocess,"run") as runner:
            with self.assertRaises(ValueError):B.backup(self.path)
            runner.assert_not_called()
    def test_failed_dump_leaves_no_artifacts(self):
        with patch.dict(os.environ,self.env,clear=True),patch.object(B.subprocess,"run",side_effect=OSError("test failure")):
            with self.assertRaises(OSError):B.backup(self.path)
            self.assertEqual(list(self.path.parent.iterdir()),[])

if __name__=="__main__":unittest.main()
