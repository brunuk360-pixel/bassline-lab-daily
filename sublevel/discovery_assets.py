"""Resolve release artwork from the curated artist/label pages; never substitute invented covers."""
import json
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import urlparse, urljoin
from urllib.request import Request, urlopen
from pathlib import Path
class Meta(HTMLParser):
    def __init__(self): super().__init__(); self.image=""
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="meta" and a.get("property","").lower()=="og:image" and not self.image: self.image=a.get("content","")
def get_art(url):
    try:
        host=urlparse(url).hostname or ""
        if not (host.endswith(".bandcamp.com") or host=="www.hospitalrecords.com"): return ""
        with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 SUBLEVEL editorial"}),timeout=7) as res:
            parser=Meta();parser.feed(res.read(1600000).decode("utf-8","replace"))
        src=urljoin(url,parser.image)
        if not parser.image or urlparse(src).scheme!="https": return ""
        if not (urlparse(src).hostname or "").endswith((".bcbits.com",".shopify.com")): return ""
        return src
    except Exception:return ""
def load_discovery(root):
    data=json.loads((root/"discovery-data.json").read_text(encoding="utf-8"))
    unique=list(dict.fromkeys(row[6] for row in data["items"]))
    with ThreadPoolExecutor(max_workers=10) as pool: images=dict(zip(unique,pool.map(get_art,unique)))
    data["artwork"]={row[0]:images[row[6]] for row in data["items"] if images[row[6]]}
    print("Discovery artwork available:",len(data["artwork"]),"of",len(data["items"]))
    return data
