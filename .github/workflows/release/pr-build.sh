#!/usr/bin/env bash

set -euo pipefail

echo "Construindo imagem Docker"
# Build with timeout and progress to avoid GitHub Actions truncation issues
timeout 600 docker build \
  --progress=plain \
  -t amazarashi-pr-test:latest \
  . || exit 1

echo "✅ Docker build completed successfully"
