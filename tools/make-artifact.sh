#!/bin/bash
# Makes the claude.ai artifact copy from index.html (the one file everyone edits).
# Writes everything between <body> and </body> to the path given (default: artifact.html, which git ignores).
cd "$(dirname "$0")/.."
out="${1:-artifact.html}"
awk '/^<body>$/{on=1; next} /^<\/body>$/{on=0} on' index.html > "$out"
echo "wrote $out"
