from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]


def load_catalog(locale):
    catalog = {}
    path = root / 'tools' / f'translations-{locale}.tsv'
    for line in path.read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        source, target = line.split('\t', 1)
        if source in catalog or not target.strip():
            raise ValueError(f'Invalid {locale} translation: {source}')
        catalog[source] = target.strip()
    return catalog


catalogs = {locale: load_catalog(locale) for locale in ('en', 'zh-CN', 'tr')}
for locale, catalog in catalogs.items():
    missing = catalogs['en'].keys() - catalog.keys()
    extra = catalog.keys() - catalogs['en'].keys()
    if missing or extra:
        raise ValueError(f'{locale} catalog mismatch. Missing: {sorted(missing)}. Extra: {sorted(extra)}')

runtime = (root / 'tools/i18n-runtime.js').read_text(encoding='utf-8')
code = runtime.replace('/*CATALOGS*/{}', json.dumps(catalogs, ensure_ascii=False, indent=1))
(root / 'dist/i18n.js').write_text(code, encoding='utf-8')
print('Built ' + ', '.join(f'{locale}: {len(catalog)}' for locale, catalog in catalogs.items()))
