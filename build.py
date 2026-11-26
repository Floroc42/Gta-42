#!/usr/bin/env python3
import re, pathlib

root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text(encoding='utf-8')

def inline_css(m):
    css = (root / m.group(1)).read_text(encoding='utf-8')
    return '<style>\n' + css + '\n</style>'

def inline_js(m):
    js = (root / m.group(1)).read_text(encoding='utf-8')
    if '</script' in js.lower():
        raise SystemExit('Cannot inline %s (contains </script>)' % m.group(1))
    return '<script>\n' + js + '\n</script>'

out = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
out = re.sub(r'<script src="([^"]+)"></script>', inline_js, out)

dist = root / 'dist' / 'gta42-saint-etienne.html'
dist.parent.mkdir(exist_ok=True)
dist.write_text(out, encoding='utf-8')
print('Written', dist, '%.1f KB' % (dist.stat().st_size / 1024))
