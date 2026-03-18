#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Error: ANTHROPIC_API_KEY environment variable is not set."
  echo "Run: export ANTHROPIC_API_KEY=your_key_here"
  exit 1
fi

echo "Installing dependencies..."
pip install -q -r backend/requirements.txt

echo ""
echo "Starting EB-1A / NIW Petition Builder..."
echo "Open http://localhost:8000 in your browser"
echo ""

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
