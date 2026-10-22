#!/usr/bin/env python3
"""Portable build gate for the approved bundled WATA icon catalog."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
record=json.loads((root/'assets/wata-icons/current.json').read_text())
errors=[]
for name,digest in record['files'].items():
 p=root/name
 if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=digest:errors.append(name)
for name,expected in record.get('manifests',{}).items():
 try:
  if json.loads((root/name).read_text()).get('icons')!=expected:errors.append(name)
 except (ValueError,FileNotFoundError):errors.append(name)
if errors:raise SystemExit('Outdated/missing WATA icons: '+', '.join(errors[:12])+'. Run icons:sync from the WATA workspace.')
print('WATA icon catalog '+record['version']+': '+str(len(record['files']))+' files verified')
