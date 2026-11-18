"""Import a daily issue from a configured HTTPS URL and rebuild editions.json.

GitHub repository variable MAGAZINE_SOURCE_URL_TEMPLATE may contain {date},
e.g. https://example.com/issues/{date}.html. The upstream provider must host
full actual magazine HTML. Without a source, index existing editions only.
"""
import datetime as dt
import json
import os
import pathlib
import re
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
ED = ROOT / 'editions'
ED.mkdir(exist_ok=True)
date = os.environ.get('INPUT_DATE') or dt.datetime.now(dt.timezone.utc).date().isoformat()
dt.date.fromisoformat(date)
url = os.environ.get('INPUT_URL') or os.environ.get('SOURCE_TEMPLATE', '').replace('{date}', date)
if url:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname:
        raise SystemExit('Magazine source must be a full HTTPS URL')
    out = ED / f'{date}.html'
    if not out.exists():
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'BasslineLabPublisher/1.0'}), timeout=40) as resp:
            content = resp.read(25_000_001)
        if len(content) > 25_000_000:
            raise SystemExit('Magazine exceeds 25 MB')
        if b'<html' not in content[:30000].lower() and b'<!doctype html' not in content[:30000].lower():
            raise SystemExit('Response is not a full HTML magazine')
        out.write_bytes(content)
entries = []
for p in sorted(ED.glob('????-??-??.html'), reverse=True):
    try: dt.date.fromisoformat(p.stem)
    except ValueError: continue
    entries.append({'date': p.stem, 'title': f'Bassline Lab • {p.stem}', 'file': f'editions/{p.name}'})
(ROOT / 'editions.json').write_text(json.dumps({'editions': entries}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'Indexed {len(entries)} edition(s); latest: {entries[0]["date"] if entries else "none"}')
