import json
from pathlib import Path

a = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))
print('--- Community 0 (largest, 6 members) ---')
c0 = a['communities'].get('0', [])
for node_id in c0:
    print(f'  {node_id}')

# Look at source files for these nodes
extract = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
print('\n--- Node details for Community 0 ---')
node_map = {n['id']: n for n in extract['nodes']}
for node_id in c0:
    n = node_map.get(node_id, {})
    print(f"  {node_id}: type={n.get('type','?')}, label={n.get('label','?')[:60] if n.get('label') else '?'}")

# Also look at the 5 edges that exist in the graph (from the build step output)
print('\n--- Sample of edges in extract (check if any match) ---')
for e in extract['edges'][:5]:
    print(f"  {e['source']} -> {e['target']} (type={e.get('type', '?')})")

# Find other communities with >1 members
print('\n--- Other communities with >1 member ---')
for cid, members in sorted(a['communities'].items(), key=lambda x: -len(x[1])):
    if len(members) > 1:
        print(f'  Community {cid}: {len(members)} members')
        for m in members[:3]:
            n = node_map.get(m, {})
            print(f'    {m} (type={n.get("type", "?")})')
