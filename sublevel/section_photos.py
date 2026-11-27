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
        # The original embedded artwork remains the second layer if the new image fails.
        return f'html body #app .night-home {selector}::before {{background-image:url("{image}"),var(--night-photo)!important;background-size:cover,cover!important;background-position:center,center!important;filter:brightness(1.10) saturate(.90) contrast(1.03)!important;opacity:1!important;}}'
    with ThreadPoolExecutor(max_workers=5) as pool:
        css="\n".join(pool.map(fetch,PHOTOS))
    credits='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SUBLEVEL Photography Credits</title><body style="background:#080e10;color:#edf2ee;font:16px system-ui;padding:24px;line-height:1.7"><h1>Photography credits</h1><a style="color:#79c9b7" href="./">Back to SUBLEVEL</a><ul>'
    for name,photo,credit,source,selector,width in PHOTOS:
        credits+=f'<li>{escape(name.replace("-"," ").title())}: <a style="color:#79c9b7" href="{escape(source)}">{escape(credit)} on Unsplash</a> — Unsplash License</li>'
    (Path(publish)/"photo-credits.html").write_text(credits+"</ul></body></html>",encoding="utf-8")
    css+="""
html body #app .night-home .night-banner::after,html body #app .night-home .stream-listen .night-feature::after{background:linear-gradient(90deg,#080e10eb 0%,#080e10aa 32%,#080e1030 65%,#080e1000 100%),linear-gradient(0deg,#080e1055,transparent 48%)!important}
html body #app .night-home .stream-moods .night-tile::after{background:linear-gradient(0deg,#080e10ef 0%,#080e1090 26%,#080e1000 67%)!important}
html body #app .night-home .stream-moods .night-tile{min-height:clamp(120px,31vw,195px)!important}
html body #app .night-home .stream-moods .night-tile b{color:#f6f5ef!important;font-weight:700!important;text-shadow:0 1px 2px #0008}
html body #app .night-home .stream-moods .night-tile small{color:#d8e4df!important}
"""
    return css
