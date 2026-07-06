import json
from pathlib import Path
result = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
print(f'Corpus: {result["total_files"]} files')
for cat in ['code', 'docs', 'papers', 'images', 'video']:
    count = len(result['files'].get(cat, []))
    if count > 0:
        print(f'  {cat}: {count} files')