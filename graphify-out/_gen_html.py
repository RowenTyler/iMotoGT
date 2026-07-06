import json
from pathlib import Path

g = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
html = '''<html><head><meta charset="utf-8"><title>iMoto Graph</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;padding:20px;max-width:1400px;margin:auto}
h1{color:#2563eb}h2{margin-top:30px;border-bottom:2px solid #e5e7eb;padding-bottom:8px}
.stats{display:flex;gap:20px;margin:20px 0}.stat{padding:15px 25px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
.stat b{display:block;font-size:28px;color:#1e293b}.stat span{font-size:12px;color:#64748b;text-transform:uppercase}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:8px 12px;text-align:left}
th{background:#f1f5f9;font-weight:600;color:#475569;border-bottom:2px solid #cbd5e1}
td{border-bottom:1px solid #e2e8f0}.community-tag{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;background:#dbeafe;color:#1e40af;margin-right:4px}
tr:hover{background:#f8fafc}.qs{background:#f0fdf4;padding:15px;border-radius:8px;margin:10px 0}
.gods{background:#fefce8;padding:15px;border-radius:8px;margin:10px 0}
.surprise{background:#fdf2f8;padding:15px;border-radius:8px;margin:10px 0}
a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}
</style></head><body>
<h1>iMotoGT Knowledge Graph</h1>
'''

stats = {
    'Nodes': len(g.get('nodes', [])),
    'Edges': len(g.get('edges', [])),
    'Communities': len(g.get('communities', []))
}
html += '<div class="stats">'
for k, v in stats.items():
    html += f'<div class="stat"><b>{v:,}</b><span>{k}</span></div>'
html += '</div>'

# Questions section
if 'suggested_questions' in g and g['suggested_questions']:
    html += '<div class="qs"><h2>Suggested Questions</h2>'
    for q in g['suggested_questions'][:5]:
        html += f'<p>{q}</p>'
    html += '</div>'

# God nodes
if 'god_nodes' in g and g['god_nodes']:
    html += '<div class="gods"><h2>God Nodes (Hubs)</h2><ul>'
    for god in g['god_nodes'][:10]:
        html += f'<li>{god}</li>'
    html += '</ul></div>'

# Surprising connections
if 'surprising_connections' in g and g['surprising_connections']:
    html += '<div class="surprise"><h2>Surprising Connections</h2><ul>'
    for conn in g['surprising_connections'][:5]:
        html += f'<li>{conn}</li>'
    html += '</ul></div>'

# Communities
html += '<h2>Communities</h2>'
for c in g.get('communities', [])[:30]:
    label = c.get('label', f'Community {c.get("id", "?")}')
    nodes = c.get('nodes', [])
    html += f'<h3><span class="community-tag">{label}</span> {len(nodes)} members</h3>'
    html += '<table><tr><th>Node ID</th><th>Type</th></tr>'
    for n in nodes[:20]:
        nid = n.get('id', '')
        ntype = n.get('type', '-')
        html += f'<tr><td>{nid}</td><td>{ntype}</td></tr>'
    if len(nodes) > 20:
        html += f'<tr><td colspan="2">... and {len(nodes)-20} more</td></tr>'
    html += '</table>'

# Nodes table
html += '<h2>All Nodes</h2><table><tr><th>ID</th><th>Label</th><th>Type</th><th>Community</th></tr>'
for n in g.get('nodes', [])[:200]:
    nid = n.get('id', '')
    nlabel = n.get('label', '-')
    ntype = n.get('type', '-')
    ncomm = n.get('community', '-')
    html += f'<tr><td>{nid}</td><td>{nlabel}</td><td>{ntype}</td><td>{ncomm}</td></tr>'
if len(g.get('nodes', [])) > 200:
    html += f'<tr><td colspan="4">... and {len(g["nodes"])-200:,} more nodes</td></tr>'
html += '</table></body></html>'

Path('graphify-out/graph.html').write_text(html, encoding='utf-8')
print(f'HTML generated: {len(g.get("nodes", []))} nodes, {len(g.get("edges", []))} edges, {len(g.get("communities", []))} communities')