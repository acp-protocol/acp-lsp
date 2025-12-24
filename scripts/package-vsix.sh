#!/bin/bash
# Package the VS Code extension as VSIX

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="$PROJECT_DIR/packages/client"

echo "Building all packages..."
cd "$PROJECT_DIR"
pnpm build

echo "Packaging VSIX..."
cd "$CLIENT_DIR"
pnpm package

echo "VSIX package created successfully!"
ls -la "$CLIENT_DIR"/*.vsix 2>/dev/null || echo "No VSIX file found"