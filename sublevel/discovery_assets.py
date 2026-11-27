"""Resolve genuine release covers. No generic image is represented as album art."""
import json
import re
import time
import unicodedata
from urllib.parse import urlencode
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import urlparse, urljoin
from urllib.request import Request, urlopen
from pathlib import Path

class Meta(HTMLParser):
    def __init__(self): super().__init__(); self.images=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="meta" and a.get("property",a.get("name","")).lower() in ("og:image","og:image:secure_url","twitter:image","twitter:image:src"):
            self.images.append(a.get("content",""))
        if tag=="link" and a.get("rel","").lower()=="image_src":
            self.images.append(a.get("href",""))
        if tag=="img" and ("popupImage" in a.get("class","") or "tralbumArt" in a.get("id","")):
            self.images.append(a.get("src",""))

def get_art(url):
    try:
        host=urlparse(url).hostname or ""
        if not (host.endswith(".bandcamp.com") or host=="www.hospitalrecords.com"): return ""
        with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; SUBLEVEL Editorial/1.1; https://crate-music.onrender.com/)","Accept":"text/html"}),timeout=7) as res:
            parser=Meta();raw=res.read(2200000).decode("utf-8","replace");parser.feed(raw)
        # Bandcamp may provide the cover via release metadata rather than OpenGraph.
        for match in re.finditer(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',raw,re.I|re.S):
            try:
                obj=json.loads(match.group(1))
                if isinstance(obj,dict) and obj.get("@type") in ("MusicAlbum","MusicRecording"):
                    art=obj.get("image")
                    if isinstance(art,str):parser.images.append(art)
                    elif isinstance(art,list):parser.images.extend(x for x in art if isinstance(x,str))
                    elif isinstance(art,dict):parser.images.append(art.get("url",""))
            except (ValueError,TypeError):pass
        for img in parser.images:
            src=urljoin(url,img)
            p=urlparse(src)
            if img and p.scheme=="https" and (p.hostname or "").endswith((".bcbits.com",".shopify.com",".bandcamp.com")):
                return src
    except Exception: pass
    return ""

# Known album relationships, not fuzzy same-title guesses.
ALBUMS={
 "allnight":("Camo & Krooked","Zeitgeist"),
 "movearound":("Camo & Krooked","Zeitgeist"),
 "between":("Camo & Krooked","Between the Lines"),
 "original":("The Prodigy","Firestarter"),
 "memory":("Netsky","Netsky"),
 "burial-untrue":("Burial","Untrue"),
 "burial-debut":("Burial","Burial"),
 "fp-crush":("Floating Points","Crush"),
 "photek":("Photek","DJ-Kicks"),
}
def normalize(x):
    return "".join(c for c in unicodedata.normalize("NFKD",x).casefold() if c.isalnum())
def find_group(artist,title):
    # Respect MusicBrainz's one-request-per-second limit.
    time.sleep(1.1)
    query='releasegroup:"'+title.replace('"','')+'" AND artist:"'+artist.replace('"','')+'"'
    url="https://musicbrainz.org/ws/2/release-group/?"+urlencode({"query":query,"fmt":"json","limit":8})
    try:
        req=Request(url,headers={"User-Agent":"SUBLEVEL/1.2 (https://crate-music.onrender.com/)","Accept":"application/json"})
        with urlopen(req,timeout=4) as res: obj=json.load(res)
        for group in obj.get("release-groups",[]):
            if normalize(group.get("title",""))!=normalize(title):continue
            credits=[c.get("artist",{}).get("name","") for c in group.get("artist-credit",[]) if isinstance(c,dict)]
            if normalize(artist) not in [normalize(c) for c in credits]:continue
            mbid=group.get("id","")
            if re.fullmatch(r"[a-f0-9-]{36}",mbid):return mbid
    except Exception:pass
    return ""
def archive_art(mbid):
    url=f"https://coverartarchive.org/release-group/{mbid}/front-500"
    try:
        with urlopen(Request(url,headers={"User-Agent":"SUBLEVEL/1.2 (https://crate-music.onrender.com/)","Accept":"image/*"}),timeout=6) as res:
            if not res.headers.get("Content-Type","").startswith("image/") or not res.read(16):return ""
        return url
    except Exception:return ""

def load_discovery(root):
    data=json.loads((root/"discovery-data.json").read_text(encoding="utf-8"))
    unique=list(dict.fromkeys(row[6] for row in data["items"]))
    with ThreadPoolExecutor(max_workers=8) as pool:
        images=dict(zip(unique,pool.map(get_art,unique)))
    data["artwork"]={row[0]:images[row[6]] for row in data["items"] if images[row[6]]}
    data["artworkSources"]={row[0]:row[6] for row in data["items"] if images[row[6]]}
    group_cache={}
    deadline=time.monotonic()+24
    for k,(artist,title) in ALBUMS.items():
        if k in data["artwork"]:continue
        if time.monotonic()>deadline:break
        key=(artist,title)
        if key not in group_cache:
            mbid=find_group(artist,title)
            group_cache[key]=(mbid,archive_art(mbid)) if mbid else ("","")
        mbid,img=group_cache[key]
        if img:
            data["artwork"][k]=img
            data["artworkSources"][k]=f"https://musicbrainz.org/release-group/{mbid}"
    print("Discovery artwork available:",len(data["artwork"]),"of",len(data["items"]))
    return data
