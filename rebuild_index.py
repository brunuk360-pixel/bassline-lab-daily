#!/usr/bin/env python3
"""Rebuild the edition catalogue from HTML filenames in editions/."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
old={v.get('date'):v for v in json.loads((root/'editions.json').read_text()).get('editions',[])}
editions=[]
for f in sorted((root/'editions').glob('*.html'),reverse=True):
 if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',f.stem):continue
 editions.append({'date':f.stem,'title':old.get(f.stem,{}).get('title','Bassline Lab • Daily edition'),'file':'editions/'+f.name})
(root/'editions.json').write_text(json.dumps({'editions':editions},ensure_ascii=False,indent=2)+'\n')
print('Indexed',len(editions),'editions')
