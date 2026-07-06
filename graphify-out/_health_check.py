import json
from pathlib import Path

ext = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
node_ids = {n['id'] for n in ext['nodes']}
print(f'Nodes: {len(node_ids)}')
print(f'Edges: {len(ext["edges"])}')

dangling = 0
for e in ext['edges']:
    s, t = e['source'], e['target']
    issues = []
    if s not in node_ids:
        issues.append(f'src_missing({s})')
    if t not in node_ids:
        issues.append(f'tgt_missing({t})')
    if issues:
        dangling += 1

print(f'Dangling/missing endpoint edges: {dangling}')

if ext['edges']:
    print('Sample edges:')
    for i, e in enumerate(ext['edges'][:5]):
        s, t = e['source'], e['target']
        print(f'  Edge {i}: {s} -> {t}  src_exists={s in node_ids} tgt_exists={t in node_ids}')

print('\nSample node IDs (first 5):')
for n in list(node_ids)[:5]:
    print(f'  {n}')