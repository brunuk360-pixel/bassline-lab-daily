"""Download licensed section photography, preserving the existing images on failure."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from html import escape

PHOTOS=[
 ("genres","1779090989013-1055eeb71ff1","Pixels and Blue Skies","https://unsplash.com/photos/MN_P-C0CXb4",".night-banner",1200),
 ("underground","1789496956376-4a29fea97cc1","Emmanuel Black","https://unsplash.com/photos/vuZOquKODGs",".stream-listen .night-feature",1200),
 ("warehouse","1675116268414-cece14d1d8fc","Colton Sturgeon","https://unsplash.com/photos/YViBSFfKubI",".stream-moods .night-tile:nth-child(1)",640),
 ("afterhours","1788767722194-b09c018f0be9","Ramin Talebi","https://unsplash.com/photos/2_KldkmLkzQ",".stream-moods .night-tile:nth-child(2)",640),
 ("late-drive","1774876289606-81a8bc32fd72","MChe Lee","https://unsplash.com/photos/DHwy7bYDmhk",".stream-moods .night-tile:nth-child(3)",640),
]
# Scene photography is separate from release artwork and homepage photos.
GENRE_PHOTOS=[
 ("scene-rock","1693813990038-e8fb2e49e78b","Adam Gritco","https://unsplash.com/photos/A33Dif_TpII",None,900),
 ("scene-hiphop","1770155497036-aadb6cae3de4","David Vilches","https://unsplash.com/photos/iSWb2dnkEW4",None,900),
 ("scene-indie","1760160741895-eade1f12d01e","Brooke Balentine","https://unsplash.com/photos/Wx66pPYvdjk",None,900),
]
def install_photos(publish):
    directory=Path(publish)/"section-art"
    directory.mkdir(parents=True,exist_ok=True)
    def fetch(p):
        name,photo,credit,source,selector,width=p
        url=f"https://images.unsplash.com/photo-{photo}?fit=crop&w={width}&q=82&fm=jpg"
        try:
            req=Request(url,headers={"User-Agent":"Mozilla/5.0 SUBLEVEL Editorial"})
            with urlopen(req,timeout=12) as res:
                data=res.read(3000001)
            if not (data.startswith(b"\xff\xd8\xff") and 5000<len(data)<=3000000):
                raise ValueError("Invalid image")
            (directory/f"{name}.jpg").write_bytes(data)
            image=f"section-art/{name}.jpg"
            print("Section photo downloaded:",name,len(data))
        except Exception as e:
            image=url
            print("Section photo remote fallback:",name,type(e).__name__)
        if selector is None:
            return ""
        # The original embedded artwork remains the second layer if the new image fails.
        return f'html body #app .night-home {selector}::before {{background-image:url("{image}"),var(--night-photo)!important;background-size:cover,cover!important;background-repeat:no-repeat,no-repeat!important;background-position:center,center!important;filter:brightness(1.10) saturate(.90) contrast(1.03)!important;opacity:1!important;}}'
    with ThreadPoolExecutor(max_workers=5) as pool:
        css="\n".join(pool.map(fetch,PHOTOS+GENRE_PHOTOS))
    credits='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SUBLEVEL Photography Credits</title><body style="background:#080e10;color:#edf2ee;font:16px system-ui;padding:24px;line-height:1.7"><h1>Photography credits</h1><a style="color:#79c9b7" href="./">Back to SUBLEVEL</a><ul>'
    for name,photo,credit,source,selector,width in PHOTOS+GENRE_PHOTOS:
        credits+=f'<li>{escape(name.replace("-"," ").title())}: <a style="color:#79c9b7" href="{escape(source)}">{escape(credit)} on Unsplash</a> — Unsplash License</li>'
    (Path(publish)/"photo-credits.html").write_text(credits+"</ul></body></html>",encoding="utf-8")
    css+="""
html body #app .night-home .night-banner::after,html body #app .night-home .stream-listen .night-feature::after{background:linear-gradient(90deg,#080e10eb 0%,#080e10aa 32%,#080e1030 65%,#080e1000 100%),linear-gradient(0deg,#080e1055,transparent 48%)!important}
html body #app .night-home .stream-moods .night-tile::after{background:linear-gradient(0deg,#080e10ef 0%,#080e1090 26%,#080e1000 67%)!important}
html body #app .night-home .stream-moods .night-tile{min-height:clamp(120px,31vw,195px)!important}
html body #app .night-home .stream-moods .night-tile b{color:#f6f5ef!important;font-weight:700!important;text-shadow:0 1px 2px #0008}
html body #app .night-home .stream-moods .night-tile small{color:#d8e4df!important}
/* One spacing rhythm across the homepage, rather than accumulated legacy margins. */
html body #app .night-home {--sl-section-space:20px;}
html body #app .night-home > .ed-lead{margin:0!important;padding:0!important;gap:0!important;}
html body #app .night-home > .night-section,
html body #app .night-home > .motion-section,
html body #app .night-home > .night-section.stream-moods,
html body #app .night-home > .motion-section.motion-news{
  margin:var(--sl-section-space) 0 0!important;padding:0!important;min-height:0!important;
}
html body #app .night-home > .night-section.stream-listen{margin:8px 0 0!important;padding:0!important;}
html body #app .night-home .stream-listen .ed-rotation{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:0!important;margin:0!important;padding:0!important;min-height:0!important;}
html body #app .night-home .night-banner{min-height:clamp(130px,35vw,220px)!important;margin:0!important;padding:16px 42px 16px 14px!important;}
html body #app .night-home .stream-listen .night-feature{min-height:clamp(100px,28vw,175px)!important;margin:0!important;padding:14px 42px 14px 14px!important;}
html body #app .night-home .night-banner::before,
html body #app .night-home .stream-listen .night-feature::before{inset:0!important;background-repeat:no-repeat!important;}
html body #app .night-home .stream-listen .ed-record{margin:0!important;min-height:0!important;padding:10px 0!important;gap:12px!important;height:auto!important;}
html body #app .night-home .stream-listen .ed-record img,
html body #app .night-home .stream-listen .ed-record .cover{width:58px!important;height:58px!important;flex:0 0 58px!important;}
html body #app .night-home .home-mood-label{margin:0 0 8px!important;padding:0!important;min-height:32px!important;}
html body #app .night-home .home-mood-label button{min-height:36px!important;padding:4px 0!important;}
html body #app .night-home .stream-moods .night-edits{margin:0!important;padding:0!important;gap:8px!important;}
html body #app .night-home .stream-moods .night-tile{margin:0!important;min-height:clamp(112px,30vw,190px)!important;padding:10px!important;}
html body #app .night-home .press-news-panel,
html body #app .night-home .news-feature{margin:0!important;padding:0!important;}
html body #app .night-home .news-feature .news-cover-head{position:relative!important;padding:0!important;margin:0 0 8px!important;background:transparent!important;}
html body #app .night-home .news-feature .news-cover-head .motion-title{margin:0!important;padding:0!important;min-height:30px!important;}
html body #app .night-home .news-feature .motion-news-filter{margin:4px 0 0!important;padding:0!important;}
html body #app .night-home .news-feature .motion-news-filter button{min-height:42px!important;}
html body #app .night-home .news-feature .news-item.lead summary{margin:0!important;padding:18px 12px!important;min-height:clamp(180px,52vw,320px)!important;}
@media(min-width:800px){
 html body #app .night-home{--sl-section-space:28px;}
 html body #app .night-home .stream-listen .ed-rotation{grid-template-columns:minmax(0,1.65fr) minmax(0,1fr)!important;gap:20px!important;}
 html body #app .night-home .stream-listen .ed-record{align-self:center!important;padding:12px 0!important;}
}

"""
    return css
