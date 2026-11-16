from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
import subprocess, sys
subprocess.run([sys.executable, str(root / 'tools/build-i18n.py')], check=True)
html = (dist / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (dist / 'style.css').read_text() + '\n</style>')
for name in ['data.js', 'engine.js', 'i18n.js', 'audio.js', 'gamepad.js', 'game.js']:
    html = html.replace(f'<script defer src="{name}"></script>', '<script defer>\n' + (dist / name).read_text() + '\n</script>')
# Classic inline defer scripts do not wait for the document; place them at the end of body instead.
import re
scripts = re.findall(r'<script defer>.*?</script>', html, flags=re.S)
html = re.sub(r'<script defer>.*?</script>', '', html, flags=re.S)
html = html.replace('</body>', '\n'.join(script.replace('<script defer>', '<script>') for script in scripts) + '\n</body>')
html = html.replace('<a class="secondary" href="CORE-offline.zip" download>↓ Скачать игру</a>', '')
(dist / 'CORE.html').write_text(html)
(dist / 'README.md').write_text((root / 'README.md').read_text())
if (root / 'TEST-REPORT.md').exists():
    (dist / 'TEST-REPORT.md').write_text((root / 'TEST-REPORT.md').read_text())
with ZipFile(dist / 'CORE-offline.zip', 'w', ZIP_DEFLATED) as z:
    for name in ['CORE.html', 'index.html', 'style.css', 'data.js', 'engine.js', 'i18n.js', 'audio.js', 'gamepad.js', 'game.js', 'README.md', 'TEST-REPORT.md']:
        path = dist / name
        if path.exists():
            z.write(path, 'CORE/' + name)
print('Packaged CORE.html and CORE-offline.zip')
