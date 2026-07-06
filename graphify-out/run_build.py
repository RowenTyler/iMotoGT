import json
from pathlib import Path
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json

# Load data
extraction = json.loads(Path('C:/Projects/iMoto/iMotoGT/graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
detection = json.loads(Path('C:/Projects/iMoto/iMotoGT/graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))

# Build graph
G = build_from_json(extraction, root='C:/Projects/iMoto/iMotoGT', directed=False)
print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

if G.number_of_nodes() == 0:
    print("ERROR: Graph is empty")
    exit(1)

# Cluster and analyze
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {'input': 0, 'output': 0}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: 'Community ' + str(cid) for cid in communities}
questions = suggest_questions(G, communities, labels)

# Export
wrote = to_json(G, communities, 'C:/Projects/iMoto/iMotoGT/graphify-out/graph.json')
report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, 'C:/Projects/iMoto/iMotoGT', suggested_questions=questions)

Path('C:/Projects/iMoto/iMotoGT/graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')

analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods,
    'surprises': surprises,
    'questions': questions,
}
Path('C:/Projects/iMoto/iMotoGT/graphify-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding='utf-8')

print(f"Communities: {len(communities)}")
print("Report generated: C:/Projects/iMoto/iMotoGT/graphify-out/GRAPH_REPORT.md")
print("Graph JSON: C:/Projects/iMoto/iMotoGT/graphify-out/graph.json")
