import os
import re
from pathlib import Path

root = Path("C:/Projects/iMoto/iMotoGT")
removed_logs = 0
touched_files = 0

# Walk src files (exclude node_modules, .next, graphify-out)
for ext in ("*.ts", "*.tsx"):
    for f in root.rglob(ext):
        if "/node_modules/" in str(f) or "/.next/" in str(f) or "/graphify-out/" in str(f):
            continue
        content = f.read_text(encoding="utf-8")
        original = content
        # Remove standalone console.log(...) lines (preserving blank lines for readability if needed)
        # Match lines that start with optional whitespace, then console.log( and end with optional whitespace
        cleaned_lines = []
        for line in content.splitlines(keepends=True):
            stripped = line.strip()
            if stripped.startswith("console.log(") and stripped.endswith(")"):
                removed_logs += 1
                continue  # skip this line
            cleaned_lines.append(line)
        cleaned = "".join(cleaned_lines)
        if cleaned != original:
            f.write_text(cleaned, encoding="utf-8")
            touched_files += 1

print(f"Removed {removed_logs} console.log statements from {touched_files} files")

# Remove temp file
temp_file = root / "tmp_liked_cars.tsx"
if temp_file.exists():
    temp_file.unlink()
    print(f"Removed temp file: {temp_file.name}")
else:
    print(f"Temp file already gone")
