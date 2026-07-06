import json
from pathlib import Path

if Path('graphify-out/.graphify_analysis.json').exists():
    a = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))
    print(f'Analysis: {len(a["communities"])} communities')
    sizes = {}
    for cid, members in a['communities'].items():
        sizes[cid] = len(members)
    for cid, size in sorted(sizes.items(), key=lambda x: -x[1])[:10]:
        print(f'  Community {cid}: {size} members')
else:
    print('No analysis file')

if Path('graphify-out/graph.json').exists():
    g = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
    print(f'Graph: {len(g.get("nodes", []))} nodes, {len(g.get("edges", []))} edges')
    # Show sample node labels per top community
    if 'communities' in g:
        print('Top communities by node count:')
        for c in g['communities'][:5]:
            print(f"  {c['label']}: {len(c.get('nodes', []))} nodes")
else:
    print('No graph file')