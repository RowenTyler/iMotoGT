import sys, json
from pathlib import Path
from graphify.extract import collect_files, extract

detect = json.loads(Path('C:/Projects/iMoto/iMotoGT/graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
code_files = []
for f in detect.get('files', {}).get('code', []):
    code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])

if code_files:
    result = extract(code_files, cache_root=Path('C:/Projects/iMoto/iMotoGT'))
    Path('C:/Projects/iMoto/iMotoGT/graphify-out/.graphify_ast.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
    print("AST:", len(result["nodes"]), "nodes,", len(result["edges"]), "edges")
else:
    Path('C:/Projects/iMoto/iMotoGT/graphify-out/.graphify_ast.json').write_text(json.dumps({'nodes':[],'edges':[],'input_tokens':0,'output_tokens':0}, ensure_ascii=False), encoding='utf-8')
    print("No code files")
