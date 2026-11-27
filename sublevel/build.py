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
"""
patch = ('<style id="sublevel-banner-layout-v1">\n' + css + '</style>\n').encode()
assert b'id="sublevel-banner-layout-v1"' not in data
data, count = re.subn(br"</head\s*>", lambda m: patch + m.group(0), data, count=1, flags=re.I)
assert count == 1, "Missing HTML head"
output = pathlib.Path("crate-public/index.html")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_bytes(data)
print("Published SUBLEVEL with banner overlay and compact controls.")
