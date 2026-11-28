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
            final=urlparse(res.geturl())
            original=urlparse(url)
            if final.scheme!="https" or final.netloc!=original.netloc or final.path.rstrip("/")!=original.path.rstrip("/"):return ""
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
            if not img or not trusted_cover_url(src):continue
            # Bandcamp release covers use the a-prefixed artwork ID, not
            # the user/avatar image IDs or general label graphics.
            if host.endswith(".bandcamp.com") and not ((p.hostname or "").endswith(".bcbits.com") and re.fullmatch(r"/img/a\d+_\d+\.(?:jpg|png|webp)",p.path,re.I)):continue
            try:
                with urlopen(Request(src,headers={"Accept":"image/*"}),timeout=4) as art:
                    if art.headers.get("Content-Type","").startswith("image/") and art.read(16):return src
            except Exception:continue
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
def archive_art(mbid,kind="release-group"):
    url=f"https://coverartarchive.org/{kind}/{mbid}/front-500"
    try:
        with urlopen(Request(url,headers={"User-Agent":"SUBLEVEL/1.2 (https://crate-music.onrender.com/)","Accept":"image/*"}),timeout=6) as res:
            if not res.headers.get("Content-Type","").startswith("image/") or not res.read(16):return ""
        return url
    except Exception:return ""


# Apple catalogue metadata is a secondary source for identifiable releases.
# Match both fields strictly; a search hit alone is not a cover match.
APPLE_TARGETS={
 "gold":("DJ Fresh","Gold Dust (Shy FX Re-Edit)","song"),
 "fire":("The Prodigy","Firestarter (Andy C Remix)","song"),
 "sos":("The Breeders","S.O.S.","song"),
 "close-edit":("Art of Noise","Close (to the Edit)","song"),
 "everlasting":("Nu:Logic","Everlasting Days","song"),
 "together":("Logistics","Together","song"),
 "ultra":("Fred V & Grafix","Ultraviolet","song"),
 "apex":("London Elektricity","Just One Second (Apex Remix)","song"),
 "burial-debut":("Burial","Burial","album"),
 "source":("Source Direct","Dangerous Curves","album"),
 "posij":("Posij","Chrysalis","album"),
 "edlan":("Edlan & TENEM","Know It All / Stand Alone","album"),
 "cloned-reality":("Cloned Clouds","Reality Check","album"),
 "buttermere-touch":("Buttermere","Touch Typing","album"),
 "dusky-bindweed":("Dusky","Bindweed (Limonata Mix)","album"),
 "physics-invisible-prvail":("Physics & PRVAIL","Invisible Line (PRVAIL Remix)","song"),
 "pursefurst-pimp":("PurseFurst","PIMP","album"),
 "onho-entropic":("Onho","Entropic Voltage","album"),
 "cnc":("Computer Numerical Control","IONIO EP","album"),
 "nookie":("Nookie","Atmospheric Interlude EP","album"),
 "malps-luv":("Malps & Cam Foster","We Luv It EP","album"),
 "axel-wrong":("Axel Karakasis","Wrong Intent","album"),
 "velvet-dust":("Kristin Velvet","The Dust","album"),
 "rendher-circles":("Rendher","Circles Thru My Mind","album"),
 "nightshift-translation":("Nightshift","Translation","album"),
 "ldf-spiral":("L.D.F. & Byron the Aquarius","Spiral EP","album"),
 "postal-paranoia":("Postal","Paranoia / Big Up","album"),
 "soulintent-corruptions":("Soul Intent","Corruptions Of Form","album"),
 "kenlai-eclipse":("Kenlai","Eclipse","album"),
 "hedust-ketacid":("HedustMA, NBS000","Ketacid","album"),
 "hoax":("Hoax","Genesis","album"),
 "owl":("Owl","Spectral Shadows EP","album"),
 "elys":("Elys","Serenity","album"),
 "ghost":("Ghost Snares","Protected EP","album"),
 "lemon":("Lemon Ride","Impression EP","album"),
 "kusht-quest":("Kusht","Quest","album"),
 "siwotha-fall":("Siwotha You & Luna Sage","NACH DEM FALL","album"),
 "toya-ngia":("Toya Delazy & Neekeetone","Ngiakuthanda","song"),
}
def exact_store_title(found,title,entity):
    if normalize(found)==normalize(title):return True
    if entity!="album":return False
    # Remove store display suffixes on both sides; do not remove mix names.
    strip=lambda s:re.sub(r"\s+(?:-\s+)?(?:EP|Single)$","",s,flags=re.I)
    return normalize(strip(found))==normalize(strip(title))

def apple_cover(spec):
    artist,title,entity=spec
    url="https://itunes.apple.com/search?"+urlencode({"term":artist+" "+title,"country":"GB","media":"music","entity":entity,"limit":12})
    try:
        with urlopen(Request(url,headers={"User-Agent":"SUBLEVEL Editorial/1.3","Accept":"application/json"}),timeout=4) as res:
            obj=json.load(res)
        for item in obj.get("results",[]):
            name=item.get("trackName" if entity=="song" else "collectionName","")
            # Storefronts sometimes append the release format, not a different mix.
            if not exact_store_title(name,title,entity) or normalize(item.get("artistName",""))!=normalize(artist):continue
            art=item.get("artworkUrl100","")
            source=item.get("trackViewUrl" if entity=="song" else "collectionViewUrl","")
            if not (urlparse(art).scheme=="https" and (urlparse(art).hostname or "").endswith(".mzstatic.com")):continue
            if urlparse(source).hostname not in ("music.apple.com","itunes.apple.com"):continue
            # Larger rendering of the same catalogue image, never a different image.
            art=re.sub(r"/100x100(bb)?\.",r"/400x400\1.",art)
            with urlopen(Request(art,headers={"User-Agent":"Mozilla/5.0","Accept":"image/*"}),timeout=4) as img:
                if not img.headers.get("Content-Type","").startswith("image/") or not img.read(16):continue
            return art,source
    except Exception:pass
    return "",""

def trusted_cover_url(art):
    p=urlparse(art)
    host=p.hostname or ""
    return p.scheme=="https" and not p.username and not p.password and (host.endswith((".bcbits.com",".mzstatic.com",".shopify.com")) or host in ("coverartarchive.org","i.scdn.co"))

def apply_reviewed_covers(data):
    for row in data["items"]:
        key=row[0]
        item=data.get("reviewedArtwork",{}).get(key,{})
        art,source=item.get("art",""),item.get("source","")
        if (item.get("title")==row[1] and item.get("artist")==row[2]
            and item.get("releaseUrl")==row[6] and trusted_cover_url(art)
            and urlparse(source).scheme=="https" and urlparse(source).hostname):
            data["artwork"][key]=art
            data["artworkSources"][key]=source

def cover_manifest(data):
    """Public release metadata only. No tokens, user data or audio URLs."""
    return {row[0]:{"title":row[1],"artist":row[2],"releaseUrl":row[6],
        "art":data["artwork"][row[0]],"source":data["artworkSources"][row[0]]}
        for row in data["items"] if row[0] in data["artwork"]
        and row[0] in data["artworkSources"] and trusted_cover_url(data["artwork"][row[0]])}

def load_release_covers(data):
    data["artwork"]={}
    data["artworkSources"]={}
    apply_reviewed_covers(data)
    missing=[row for row in data["items"] if row[0] not in data["artwork"]]
    unique=list(dict.fromkeys(row[6] for row in missing))
    with ThreadPoolExecutor(max_workers=8) as pool:
        images=dict(zip(unique,pool.map(get_art,unique)))
    for row in missing:
        if images[row[6]]:
            data["artwork"][row[0]]=images[row[6]]
            data["artworkSources"][row[0]]=row[6]
    print("Reviewed covers retained:",len(data["items"])-len(missing),"; release pages checked:",len(unique),flush=True)

def load_discovery(root):
    data=json.loads((root/"discovery-data.json").read_text(encoding="utf-8"))
    # Reviewed images are not re-fetched on every daily build.
    load_release_covers(data)
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
    # Bound requests per build and keep previous source coverage independent of
    # the availability of a secondary service.
    targets=[(k,v) for k,v in APPLE_TARGETS.items() if k not in data["artwork"] and any(row[0]==k for row in data["items"])]
    data["exactAppleSources"]={}
    apple_count=0
    for offset in range(0,len(targets),3):
        batch=targets[offset:offset+3]
        with ThreadPoolExecutor(max_workers=3) as pool:
            for (key,_),(art,source) in zip(batch,pool.map(apple_cover,[v for k,v in batch])):
                if art:
                    data["artwork"][key]=art
                    data["artworkSources"][key]=source
                    entity=APPLE_TARGETS[key][2]
                    data["exactAppleSources"][key]={"source":source,"kind":"track" if entity=="song" else "album"}
                    apple_count+=1
        if offset+3<len(targets):time.sleep(3.1)
    print("Apple exact-match cover additions:",apple_count)
    print("Discovery artwork available:",len(data["artwork"]),"of",len(data["items"]))
    return data


def spotify_thumbnail(source,title):
    """Official oEmbed metadata for a reviewed Spotify identity.
    No preview audio, arbitrary HTML or fuzzy cover matches."""
    if not re.fullmatch(r"https://open\.spotify\.com/(?:track|album)/[A-Za-z0-9]{22}",source):
        return ""
    endpoint="https://open.spotify.com/oembed?"+urlencode({"url":source})
    try:
        with urlopen(Request(endpoint,headers={"Accept":"application/json","User-Agent":"SUBLEVEL/1.5"}),timeout=5) as res:
            obj=json.loads(res.read(100000).decode("utf-8"))
        if obj.get("provider_name")!="Spotify" or normalize(obj.get("title",""))!=normalize(title):
            return ""
        art=obj.get("thumbnail_url","")
        p=urlparse(art)
        if p.scheme!="https" or p.hostname!="i.scdn.co" or not re.fullmatch(r"/image/[a-zA-Z0-9]+",p.path):return ""
        with urlopen(Request(art,headers={"Accept":"image/*"}),timeout=5) as response:
            if not response.headers.get("Content-Type","").startswith("image/") or not response.read(16):return ""
        return art
    except Exception:return ""

def fill_embed_covers(data,embeds):
    jobs=[]
    for row in data["items"]:
        e=embeds.get(row[0],{})
        if row[0] not in data["artwork"] and e.get("provider")=="spotify":
            jobs.append((row[0],e.get("source",""),row[1]))
    added=0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for (key,source,title),art in zip(jobs,pool.map(lambda job:spotify_thumbnail(job[1],job[2]),jobs)):
            if art:
                data["artwork"][key]=art
                data["artworkSources"][key]=source
                added+=1
    print("Official Spotify oEmbed cover additions:",added,flush=True)
    print("Final discovery artwork available:",len(data["artwork"]),"of",len(data["items"]),flush=True)
    for key,item in cover_manifest(data).items():
        print("SUBLEVEL_COVER "+json.dumps({"id":key,**item},ensure_ascii=True,separators=(",",":")),flush=True)

def chart_identity(row):
    return (normalize(row["artist"]),normalize(row["title"]))

def chart_apple_jobs(feed,limit=12):
    """Rotate a bounded set of unique unresolved recordings without repeating
    the same top-ranked candidates on every build."""
    from datetime import date
    charts=feed["charts"]
    if not charts or limit<=0:return []
    offset=date.fromisoformat(feed["checked"]).toordinal()%len(charts)
    ordered=charts[offset:]+charts[:offset]
    jobs=[];seen=set()
    for rank in range(10):
        for chart in ordered:
            if rank>=len(chart["rows"]):continue
            row=chart["rows"][rank]
            key=chart_identity(row)
            if key in seen or (row.get("art") and row.get("embedUrl")):continue
            if not row["artist"].strip() or normalize(row["artist"]) in ("unknownartist","variousartists"):continue
            seen.add(key);jobs.append((row["artist"],row["title"],"song"))
    if not jobs:return []
    cursor=feed.get("lookupCursor",0)
    if not isinstance(cursor,int) or cursor<0:cursor=0
    start=cursor%len(jobs)
    return (jobs[start:]+jobs[:start])[:limit]

def enrich_chart_apple(feed,limit=12):
    from embed_sources import apple_identity
    targets=chart_apple_jobs(feed,limit)
    matches={}
    cursor=feed.get("lookupCursor",0)
    if not isinstance(cursor,int) or cursor<0:cursor=0
    if targets:
        feed["lookupCursor"]=cursor+len(targets)
        print("SUBLEVEL_CHART_CURSOR "+str(feed["lookupCursor"]),flush=True)
    for offset in range(0,len(targets),3):
        batch=targets[offset:offset+3]
        with ThreadPoolExecutor(max_workers=3) as pool:
            for (artist,title,_),(art,source) in zip(batch,pool.map(apple_cover,batch)):
                verified=apple_identity(source,"track") if source else None
                if art and trusted_cover_url(art) and verified:
                    matches[(normalize(artist),normalize(title))]=(art,source,verified["source"])
        if offset+3<len(targets):time.sleep(3.1)
    covers=players=0
    for chart in feed["charts"]:
        for row in chart["rows"]:
            found=matches.get(chart_identity(row))
            if not found:continue
            art,source,player=found
            changed=False
            if not row.get("art"):
                row["art"]=art;row["artSource"]=source;covers+=1;changed=True
            if not row.get("embedUrl"):
                row["embedUrl"]=player;players+=1;changed=True
            if changed:
                print("SUBLEVEL_CHART_MATCH "+json.dumps({"chartId":chart["id"],"title":row["title"],"artist":row["artist"],"url":row.get("url",""),"art":row.get("art",""),"artSource":row.get("artSource",""),"embedUrl":row.get("embedUrl","")},ensure_ascii=True,separators=(",",":")),flush=True)
    print("Exact Apple chart matches:",len(matches),"; new chart covers:",covers,"; new chart player sources:",players,flush=True)

def fill_chart_covers(feed):
    jobs=[]
    for chart in feed["charts"]:
        for row in chart["rows"]:
            source=row.get("embedUrl","")
            if not row.get("art") and source.startswith("https://open.spotify.com/track/"):
                jobs.append((row,source))
    added=0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for (row,source),art in zip(jobs,pool.map(lambda job:spotify_thumbnail(job[1],job[0]["title"]),jobs)):
            if art:
                row["art"]=art
                row["artSource"]=source
                added+=1
    print("Official Spotify chart cover additions:",added,flush=True)
    enrich_chart_apple(feed)
    rows=[row for chart in feed["charts"] for row in chart["rows"]]
    print("Chart artwork available:",sum(bool(r.get("art")) for r in rows),"of",len(rows),"; chart player sources:",sum(bool(r.get("embedUrl")) for r in rows),"of",len(rows),flush=True)
