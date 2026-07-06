import json
from pathlib import Path
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
detection = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))

G = build_from_json(extraction, root='.')
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}

node_map = {n['id']: n for n in extraction['nodes']}

labels = {}
for cid, members in communities.items():
    if cid == 0:
        labels[cid] = "Error Handling"
    elif len(members) > 1:
        # Use most common source file to name
        srcs = []
        for m in members:
            node = node_map.get(m, {})
            src = node.get('source_file', '')
            if src:
                srcs.append(src)
        if srcs:
            most_common = max(set(srcs), key=srcs.count) if len(set(srcs)) > 1 else srcs[0]
            label = Path(most_common).stem.replace('-', ' ').title()
            labels[cid] = label[:50]
        else:
            labels[cid] = f"Mixed {cid}"
    else:
        m = members[0]
        node = node_map.get(m, {})
        label = node.get('label', m)
        labels[cid] = label[:50] if label else f"Node {cid}"

questions = suggest_questions(G, communities, labels)
report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding='utf-8')
print('Report updated with community labels')
print(f'Labels: {len(labels)} communities labeled')

# Print top labels
for cid in sorted(communities.keys())[:20]:
    print(f'  [{cid}] {labels[cid]} ({len(communities[cid])} members)')
