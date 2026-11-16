from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
catalog={}
for line in (root/'tools/translations-en.tsv').read_text().splitlines():
    if not line.strip():continue
    source,target=line.split('\t',1)
    if source in catalog:raise ValueError('Duplicate translation: '+source)
    catalog[source]=target.strip()
code=(root/'tools/i18n-runtime.js').read_text().replace('/*CATALOG*/{}',json.dumps(catalog,ensure_ascii=False,indent=1))
(root/'dist/i18n.js').write_text(code)
print(f'Built {len(catalog)} English translations')
