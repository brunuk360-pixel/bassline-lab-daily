"""Magazine photo index: prefer publisher/label metadata, never fabricate photos."""
from html.parser import HTMLParser
from urllib.parse import urlparse, urljoin
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
import re, html, json

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images=[]
        self.figure=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=="figure": self.figure+=1
        if tag=="meta" and a.get("property",a.get("name","")).lower() in ("og:image","og:image:url","twitter:image","twitter:image:src"):
            self.images.append(a.get("content",""))
        if tag=="img" and self.figure and a.get("src"):
            self.images.append(a["src"])
    def handle_endtag(self, tag):
        if tag=="figure": self.figure=max(0,self.figure-1)

def allowed(u):
    p=urlparse(u)
    host=p.hostname or ""
    return p.scheme=="https" and (
        (host.endswith(".bandcamp.com") and p.path.startswith("/album/"))
        or (host in ("www.jungledrumandbass.co.uk","jungledrumandbass.co.uk") and p.path.startswith("/post/"))
        or (host in ("mixmag.net","www.mixmag.net") and p.path.startswith("/read/"))
        or (host in ("ra.co","www.ra.co") and p.path.startswith("/news/"))
        or (host in ("djmag.com","www.djmag.com") and p.path.startswith("/news/"))
        or (host in ("www.musictech.com","musictech.com") and p.path.startswith("/news/"))
    )
def key(u):
    p=urlparse(u)
    return p.netloc.lower()+p.path.rstrip("/")
def collect(u):
    try:
        req=Request(u,headers={"User-Agent":"Mozilla/5.0 (compatible; SUBLEVEL magazine preview)"})
        with urlopen(req,timeout=6) as res:
            if not allowed(res.geturl()): return []
            raw=res.read(1800000).decode("utf-8","replace")
        m=Metadata();m.feed(raw)
        out=[];seen=set()
        for img in m.images:
            x=urljoin(u,img)
            p=urlparse(x)
            if p.scheme!="https" or not p.hostname or any(t in x.lower() for t in ("avatar","favicon","sprite","placeholder","logo","pixel","1x1")): continue
            if p.hostname.endswith("wixstatic.com") and "/media/" in p.path:
                x=x.split("/v1/")[0]
            if x in seen: continue
            seen.add(x);out.append({"url":x,"source":u,"caption":"Artwork / photography from the linked source"})
            if len(out)>=3: break
        return out
    except Exception:
        return []
def assets(data):
    text=html.unescape(data.decode("utf-8","replace")).replace(r"\/","/")
    urls=[]
    for u in re.findall(r'https://[^\s"\'<>\\\x60]+',text):
        u=u.rstrip(".,);]")
        if allowed(u) and u not in urls: urls.append(u)
    # Related official release pages: only for specifically identified stories.
    extra={
        "the-streets-all-of-you":[
            "https://domandroland.bandcamp.com/album/reflect-the-technique-conundrum",
            "https://domandroland.bandcamp.com/album/badman-through-the-noise"],
    }
    urls=urls[:32]
    with ThreadPoolExecutor(max_workers=10) as pool:
        result={key(u):items for u,items in zip(urls,pool.map(collect,urls)) if items}
    print("Magazine photo sources available:",len(result),"of",len(urls))
    return result
