"""Build the existing SUBLEVEL site without replacing its original HTML or scripts."""
import os
import pathlib
import re

keys = sorted(k for k in os.environ if k.startswith("CRATE_SITE_"))
data = "".join(os.environ[k] for k in keys).encode("utf-8")
assert len(data) == 1091253, "Unexpected original site size; refusing to publish"
for marker in (b"brand-stage", b"masthead-issue", b"crate-header-tools", b"SUBLEVEL"):
    assert marker in data, "Expected site marker missing"
css = r"""html body .shell header.top.home-masthead .brand-stage { padding-bottom:0!important; }
html body .shell header.top.home-masthead .brand-stage::after { content:none!important;display:none!important; }
html body .shell header.top.home-masthead > .masthead-issue { grid-area:2 / 1!important;align-self:end!important; position:relative!important; z-index:4!important; background:transparent!important; margin:0 8px 4px!important; }
@media(max-width:600px){html body .shell header.top.home-masthead > .masthead-issue { grid-template-columns:auto minmax(0,1fr) auto auto!important; margin:0 5px 4px!important;padding:0 3px!important; font-size:clamp(8px,2.15vw,12px)!important;letter-spacing:0!important; }html body .shell header.top.home-masthead > .masthead-issue > span,html body .shell header.top.home-masthead > .masthead-issue > button{padding-inline:3px!important;gap:3px!important;}}
html body .shell header.top > .crate-header-tools { min-height: 36px!important; padding: 2px 12px!important; gap: 6px!important; }
html body .shell header.top > .crate-header-tools > button, html body .shell header.top > .crate-header-tools .account-trigger { min-height: 28px!important; height: 28px!important; padding: 3px 8px!important; font-size: 10px!important; line-height: 1.2!important; gap: 4px!important; }
html body .shell header.top > .crate-header-tools > button svg, html body .shell header.top > .crate-header-tools .account-trigger svg { width: 14px!important; height: 14px!important; flex: 0 0 14px!important; }
html body .shell header.top > .crate-header-tools .account-trigger i { font-size: 9px!important; }
@media(min-width:601px){html body .shell header.top > .crate-header-tools { min-height: 40px!important; padding-inline: 20px!important; }html body .shell header.top > .crate-header-tools > button, html body .shell header.top > .crate-header-tools .account-trigger {height:32px!important;min-height:32px!important;font-size:11px!important; padding-inline:10px!important;} }

/* SUBLEVEL: cohesive geometric typography and crisp masthead */
:root {
  --sublevel-type: "Space Grotesk","DM Sans",Arial,sans-serif;
  --crate-heading: var(--sublevel-type);
  --crate-reading: var(--sublevel-type);
  --crate-meta: var(--sublevel-type);
  --sublevel-serif: var(--sublevel-type);
  --ed-title: var(--sublevel-type);
}
html body, html body :is(button,input,select,textarea),
html body .shell, html body #app, html body #app .night-home {
  font-family: var(--sublevel-type)!important;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
html body #app :is(h1,h2,h3,h4),
html body #app .night-home :is(.night-banner h1,.night-feature-copy h3),
html body #app .roomhead .roomcopy h1,
html body #app .subhero h2,
html body #app .ed-intro .ed-intro-title {
  font-family: var(--sublevel-type)!important;
  font-weight: 700!important;
  font-style: normal!important;
  letter-spacing: -.035em!important;
}
html body #app .night-home .night-banner h1 :is(em,span) {
  font-family: var(--sublevel-type)!important;
  font-style: normal!important;
  font-weight: 700!important;
}
html body #app :is(.genre-sleeve .genre-name,.motion-title,.sleeve-name,.home-mood-label,.tracktitle strong,.trackline b,.news-copy b,.night-tile b) {
  font-family: var(--sublevel-type)!important;
}
html body #app .genre-sleeve .genre-name {
  font-style: normal!important;
  font-weight: 700!important;
  letter-spacing: -.025em!important;
}
html body #app .night-home .night-label {
  font-family: var(--sublevel-type)!important;
  font-weight: 600!important;
  letter-spacing: .12em!important;
}
/* Artwork is a native-resolution raster background with the approved logo baked in.
   Brighten only this artwork, not its live interface text. No blur or zoom. */
html body .shell header.top .brand-stage {
  filter: brightness(1.16) saturate(1.05)!important;
  transform: none!important;
  image-rendering: auto!important;
}
html body .shell header.top .logo {
  transform: none!important;
  filter: none!important;
}
html body .shell header.top > .masthead-issue,
html body .shell header.top > .masthead-issue :is(span,button),
html body .shell header.top > .crate-header-tools :is(button,.account-trigger) {
  font-family: var(--sublevel-type)!important;
  font-weight: 600!important;
  filter: none!important;
  text-shadow: none!important;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
html body .shell header.top > .masthead-issue {
  backdrop-filter: none!important;
  font-variant-numeric: tabular-nums;
}
@media(max-width:600px) {
  html body .shell header.top.home-masthead > .masthead-issue {gap:3px!important;min-height:24px!important;white-space:nowrap!important;}
  html body .shell header.top.home-masthead > .masthead-issue button {font-size:inherit!important;min-height:24px!important;}
  html body .shell header.top.home-masthead > .masthead-issue svg {width:12px!important;height:12px!important;}
}

/* Editorial homepage: use imagery, spacing and hierarchy instead of card frames. */
html body #app .night-home .ed-quick-listen,
html body #app .night-home .ed-resume {display:none!important;}
html body #app .night-home .ed-lead {display:block!important;grid-template-columns:minmax(0,1fr)!important;margin:0 0 10px!important;gap:0!important;}
html body #app .night-home :is(.night-section,.motion-section,.ed-rotation,.press-news-panel,.news-list,.night-tools,.night-tool-group,.motion-highlights) {
  border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;
}
html body #app .night-home :is(.night-banner,.night-feature,.night-tile) {
  border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;
}
html body #app .night-home :is(.night-banner,.night-feature)::after {
  background:linear-gradient(90deg,#080e10ed 0%,#080e10a6 38%,#080e1010 85%),
    linear-gradient(0deg,#080e10 0%,transparent 25%,transparent 78%,#080e105e 100%)!important;
}
html body #app .night-home .night-banner {min-height:clamp(145px,34vw,230px)!important;}
html body #app .night-home .stream-listen .night-feature {min-height:clamp(96px,24vw,154px)!important;}
html body #app .night-home :is(.night-cta,.night-play) {border:0!important;box-shadow:none!important;background:transparent!important;backdrop-filter:none!important;color:#e9f4f0!important;}
html body #app .night-home > :is(.night-section,.motion-section) {margin:18px 0 0!important;padding:0!important;}
html body #app .night-home > .stream-listen {margin-top:0!important;}
html body #app .night-home .ed-record {border:0!important;background:transparent!important;box-shadow:none!important;padding:10px 0!important;}
html body #app .night-home .stream-moods .night-edits {gap:10px!important;}
html body #app .night-home .stream-moods .night-tile {border:0!important;border-radius:0!important;box-shadow:none!important;}
html body #app .night-home .stream-moods .night-tile::after {background:linear-gradient(0deg,#080e10 0%,#080e10a0 36%,transparent 85%)!important;}
html body #app .night-home :is(.news-item,.news-feature,.motion-highlight,.night-tool-group button) {
  border:0!important;border-radius:0!important;box-shadow:none!important;background-color:transparent!important;
}
html body #app .night-home :is(.night-tool-group button,.news-item):not(:last-child) {border-bottom:1px solid rgba(190,210,205,.11)!important;}
html body #app .night-home :is(.night-heading,.motion-title,.home-mood-label) {margin-bottom:9px!important;}
html body #app .night-home button:focus-visible {outline:2px solid #79c7b6!important;outline-offset:-2px;}
@media(min-width:761px){
  html body #app .night-home > :is(.night-section,.motion-section) {margin-top:24px!important;}
  html body #app .night-home > .stream-listen {margin-top:0!important;}
}
"""
patch = ('<style id="sublevel-banner-layout-v1">\n' + css + '</style>\n').encode()
assert b'id="sublevel-banner-layout-v1"' not in data
data, count = re.subn(br"</head\s*>", lambda m: patch + m.group(0), data, count=1, flags=re.I)
assert count == 1, "Missing HTML head"

# Add the magazine reader without modifying existing navigation or article copy.
import json
from magazine_images import assets
try:
    photo_index=assets(data)
except Exception as exc:
    print("Magazine source images unavailable:",type(exc).__name__)
    photo_index={}
root=pathlib.Path(__file__).resolve().parent
mag_css=(root/"magazine.css").read_text(encoding="utf-8")
mag_js=(root/"magazine.js").read_text(encoding="utf-8")
photo_json=json.dumps(photo_index,ensure_ascii=True).replace("<",r"\u003c")
mag_patch=('<style id="sublevel-magazine">'+mag_css+'</style>').encode("utf-8")
data, n=re.subn(br"</head\s*>",lambda m:mag_patch+m.group(0),data,count=1,flags=re.I)
assert n==1
reader=('<script>window.__sublevelMagazineImages='+photo_json+';</script><script>'+mag_js+'</script>').encode("utf-8")
data,n=re.subn(br"</body\s*>",lambda m:reader+m.group(0),data,count=1,flags=re.I)
assert n==1


# Editorial UX upgrades: layer on the existing site, preserving data and interactions.
editorial_css=(root/"editorial.css").read_text(encoding="utf-8")
editorial_js=(root/"editorial.js").read_text(encoding="utf-8")
editorial_patch=('<style id="sublevel-editorial-v2">'+editorial_css+'</style>').encode("utf-8")
data,n=re.subn(br"</head\s*>",lambda m:editorial_patch+m.group(0),data,count=1,flags=re.I)
assert n==1
editorial_script=('<script>'+editorial_js+'</script>').encode("utf-8")
data,n=re.subn(br"</body\s*>",lambda m:editorial_script+m.group(0),data,count=1,flags=re.I)
assert n==1


from section_photos import install_photos
section_css=install_photos("crate-public")
section_patch=('<style id="sublevel-section-photography">'+section_css+'</style>').encode("utf-8")
data,n=re.subn(br"</head\s*>",lambda m:section_patch+m.group(0),data,count=1,flags=re.I)
assert n==1


# Chosen record design, applied last to override legacy card dimensions.
record_css=(root/"record-feature.css").read_text(encoding="utf-8")
assert b"ed-record" in data
record_patch=('<style id="sublevel-record-concept-02">'+record_css+'</style>').encode("utf-8")
data,n=re.subn(br"</head\s*>",lambda m:record_patch+m.group(0),data,count=1,flags=re.I)
assert n==1


# Final shared visual system, after all older section overrides.
coherence_css=(root/"coherence.css").read_text(encoding="utf-8")
coherence_patch=('<style id="sublevel-coherent-edition">'+coherence_css+'</style>').encode("utf-8")
data,n=re.subn(br"</head\s*>",lambda m:coherence_patch+m.group(0),data,count=1,flags=re.I)
assert n==1


# Track dossier enhancements, preserving the underlying track controls and data.
dossier_css=(root/"track-dossier.css").read_text(encoding="utf-8")
dossier_js=(root/"track-dossier.js").read_text(encoding="utf-8")
dossier_patch=('<style id="sublevel-track-dossiers">'+dossier_css+'</style>').encode("utf-8")
data,n=re.subn(br"</head\s*>",lambda m:dossier_patch+m.group(0),data,count=1,flags=re.I)
assert n==1
dossier_script=('<script>'+dossier_js+'</script>').encode("utf-8")
data,n=re.subn(br"</body\s*>",lambda m:dossier_script+m.group(0),data,count=1,flags=re.I)
assert n==1


# Source-linked editorial research, independent of original track data.
research_css=(root/"research-edition.css").read_text(encoding="utf-8")
research_js=(root/"research-edition.js").read_text(encoding="utf-8")
research_patch=('<style id="sublevel-research-edition">'+research_css+'</style>').encode("utf-8")
data,n=re.subn(br"</head\s*>",lambda m:research_patch+m.group(0),data,count=1,flags=re.I)
assert n==1
research_script=('<script>'+research_js+'</script>').encode("utf-8")
data,n=re.subn(br"</body\s*>",lambda m:research_script+m.group(0),data,count=1,flags=re.I)
assert n==1

output = pathlib.Path("crate-public/index.html")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_bytes(data)
(output.parent/"record-concept-02.html").write_bytes(data)
print("Published SUBLEVEL unified editorial edition.")
