"""Resolve Bandcamp official embed identities from curated public release pages.
No audio download, no user-submitted URLs, no proxy or access bypass."""
import json,re
from html.parser import HTMLParser
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor

class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.embeds=[];self.tralbum=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="meta" and a.get("property","") in ("og:video","og:video:url","og:video:secure_url"):
            self.embeds.append(a.get("content",""))
        if tag=="iframe":self.embeds.append(a.get("src",""))
        if a.get("data-tralbum"):self.tralbum.append(a["data-tralbum"])

def identity(page,url):
    kind=urlsplit(url).path.split("/")[1]
    for value in page.embeds:
        p=urlsplit(value)
        if p.scheme=="https" and p.hostname=="bandcamp.com" and p.path.startswith("/EmbeddedPlayer/"):
            m=re.search(r"(?:^|/)"+kind+r"=(\d{1,12})(?:/|$)",p.path)
            if m:return kind,m.group(1)
    for raw in page.tralbum:
        try:
            cur=json.loads(raw).get("current") or {}
            if cur.get("item_type")==("a" if kind=="album" else "t") and re.fullmatch(r"\d{1,12}",str(cur.get("id",""))):
                return kind,str(cur["id"])
        except (ValueError,TypeError,AttributeError):pass
    return None

def resolve(row):
    url=row[6];p=urlsplit(url)
    if p.scheme!="https" or not (p.hostname or "").endswith(".bandcamp.com") or not re.fullmatch(r"/(?:album|track)/[\w.-]+/?",p.path):return None
    try:
        with urlopen(Request(url,headers={"User-Agent":"SUBLEVEL Editorial/1.4 (https://crate-music.onrender.com/)","Accept":"text/html"}),timeout=6) as res:
            final=urlsplit(res.geturl())
            if final.hostname!=p.hostname or final.path.rstrip("/")!=p.path.rstrip("/"):return None
            page=Page();page.feed(res.read(2500000).decode("utf-8","replace"))
        ident=identity(page,url)
        if ident:return row[0],{"provider":"bandcamp","kind":ident[0],"id":ident[1],"source":url}
    except Exception:pass
    return None

def resolve_embeds(data):
    rows=[r for r in data["items"] if ".bandcamp.com/" in r[6]]
    with ThreadPoolExecutor(max_workers=6) as pool:
        entries=dict(x for x in pool.map(resolve,rows) if x)
    # Reviewed official video recording, exact release identity.
    if any(r[0]=="voodoo-pendulum" for r in data["items"]):
        entries["voodoo-pendulum"]={"provider":"youtube","id":"ZYCm2cUjU7Y","source":"https://www.youtube.com/watch?v=ZYCm2cUjU7Y"}
    for key,id in {"allnight":"3FToEEIBUkUpZvnYuemi4h","backbone":"3HrHhTWonBqF4mDasi8xvC","baddadan":"2ZWmmrWUgDBcPSLihBMvhg"}.items():
        if any(r[0]==key for r in data["items"]):
            entries[key]={"provider":"spotify","kind":"track","id":id,"source":"https://open.spotify.com/track/"+id}
    # Reviewed exact provider pages, not search result guesses. Use release kind
    # for albums rather than substituting their title track.
    reviewed={
        "disconnect":("spotify","track","3VFaV7Mw0di4XFE84eHnrC"),
        "blind-faith":("spotify","track","3a6DcFuex0LLYBJgQrglXR"),
        "breathe-remix":("spotify","track","5gE6g5E0CKVestTOca0ZGN"),
        "everlasting":("spotify","track","44RYb3cMlUwn8AFboEMGUl"),
        "memory":("spotify","track","4jDHaCGAxHIqEWihIJQHZQ"),
        "gold":("spotify","track","06tTkvSWZkBEdvq2zceVrq"),
        "ultra":("spotify","track","422w50EAk1fhpXrqOsYlpv"),
        "apex":("spotify","track","18IVOQQ6apJcij5vHgWmEz"),
        "fp-crush":("spotify","album","1WwZwdTICfaZI51BIIEN9z"),
        "burial-untrue":("spotify","album","1iRPiEYHIX2zpF8lkW54SK"),
        "burial-debut":("spotify","album","1KMYOAJMs0U1rObvPuGsJE"),
        "fire":("youtube","video","Gffc7aHcP3k"),
        "movearound":("youtube","video","g2vm79u5E1I"),
    }
    ids={r[0] for r in data["items"]}
    for key,(provider,kind,id) in reviewed.items():
        if key not in ids or key in entries:continue
        source=("https://open.spotify.com/"+kind+"/"+id if provider=="spotify" else "https://www.youtube.com/watch?v="+id)
        entries[key]={"provider":provider,"kind":kind,"id":id,"source":source}
    for row in data["items"]:
        item=data.get("reviewedEmbeds",{}).get(row[0],{})
        if item.get("title")!=row[1] or item.get("artist")!=row[2]:continue
        provider,kind,ident,source=(item.get(k,"") for k in ("provider","kind","id","source"))
        if provider=="spotify" and kind in ("track","album") and re.fullmatch(r"[A-Za-z0-9]{22}",ident) and source=="https://open.spotify.com/"+kind+"/"+ident:
            entries[row[0]]={"provider":provider,"kind":kind,"id":ident,"source":source}
        elif provider=="youtube" and re.fullmatch(r"[A-Za-z0-9_-]{11}",ident) and source=="https://www.youtube.com/watch?v="+ident:
            entries[row[0]]={"provider":provider,"id":ident,"source":source}
    print("Official embed identities resolved:",len(entries),"of",len(data["items"]),flush=True)
    return entries
