#!/usr/bin/env bash
# Build the thesis PDF with TinyTeX. Runs the full pdflatex/bibtex/pdflatex/pdflatex
# sequence so cross-references, the bibliography, and the table of contents resolve.
set -u
export PATH="$PATH:$HOME/Library/TinyTeX/bin/universal-darwin"
cd "$(dirname "$0")"

JOB=thesis
LOG=/tmp/zkw-thesis-build.log

echo "[1/4] pdflatex (pass 1)"
pdflatex -interaction=nonstopmode -halt-on-error=0 "$JOB.tex" > "$LOG" 2>&1
echo "[2/4] bibtex"
bibtex "$JOB" >> "$LOG" 2>&1
echo "[3/4] pdflatex (pass 2)"
pdflatex -interaction=nonstopmode -halt-on-error=0 "$JOB.tex" >> "$LOG" 2>&1
echo "[4/4] pdflatex (pass 3)"
pdflatex -interaction=nonstopmode -halt-on-error=0 "$JOB.tex" >> "$LOG" 2>&1

echo "--- LaTeX errors (if any) ---"
grep -nE "^! " "$LOG" | head -40
echo "--- Undefined references / citations ---"
grep -ncE "undefined" "$LOG" || true
echo "--- Result ---"
grep "Output written on" "$LOG" | tail -1
ls -la "$JOB.pdf" 2>/dev/null
