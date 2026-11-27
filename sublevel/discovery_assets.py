"""Resolve genuine release covers. No generic image is represented as album art."""
import json
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
            parser=Meta();parser.feed(res.read(2200000).decode("utf-8","replace"))
        for img in parser.images:
            src=urljoin(url,img)
            p=urlparse(src)
            if img and p.scheme=="https" and (p.hostname or "").endswith((".bcbits.com",".shopify.com",".bandcamp.com")):
                return src
    except Exception: pass
    return ""

# Explicitly identified releases; use the artwork of the documented release, not
# a same-name match. Source links are exposed in the discovery interface.
ARCHIVE={
 "allnight":("release-group","1166586b-e0d5-4b31-b7ea-34bca16b074b"),
 "movearound":("release-group","b917b8ea-abaa-4d19-9737-049af63b101a"),
 "between":("release-group","17d1d216-f685-4f80-a597-c772fe66491e"),
 "original":("release","992aafb7-d09f-485c-89ac-8ef10557edc1"),
 "memory":("release","4c894d5a-7df6-402b-95dc-eeb5d62effe6"),
}
def archive_art(entry):
    typ,mbid=entry
    url=f"https://coverartarchive.org/{typ}/{mbid}/front-500"
    try:
        with urlopen(Request(url,headers={"User-Agent":"SUBLEVEL/1.1 (https://crate-music.onrender.com/)","Accept":"image/*"}),timeout=8) as res:
            if not res.headers.get("Content-Type","").startswith("image/"): return ""
            if not res.read(16):return ""
        return url
    except Exception:return ""

def load_discovery(root):
    data=json.loads((root/"discovery-data.json").read_text(encoding="utf-8"))
    unique=list(dict.fromkeys(row[6] for row in data["items"]))
    with ThreadPoolExecutor(max_workers=8) as pool:
        images=dict(zip(unique,pool.map(get_art,unique)))
    data["artwork"]={row[0]:images[row[6]] for row in data["items"] if images[row[6]]}
    data["artworkSources"]={row[0]:row[6] for row in data["items"] if images[row[6]]}
    missing=[(k,v) for k,v in ARCHIVE.items() if k not in data["artwork"]]
    with ThreadPoolExecutor(max_workers=3) as pool:
        results=pool.map(archive_art,[v for k,v in missing])
        for (k,(typ,mbid)),img in zip(missing,results):
            if img:
                data["artwork"][k]=img
                data["artworkSources"][k]=f"https://musicbrainz.org/{typ}/{mbid}"
    print("Discovery artwork available:",len(data["artwork"]),"of",len(data["items"]))
    return data
