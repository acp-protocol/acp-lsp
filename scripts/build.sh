#!/bin/bash
# Build all packages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Building shared package..."
pnpm --filter @acp-lsp/shared build

echo "Building server package..."
pnpm --filter @acp-lsp/server build

echo "Building client package..."
pnpm --filter @acp-lsp/client build

echo "Build completed successfully!"