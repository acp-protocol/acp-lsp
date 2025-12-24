#!/bin/bash
# Sync schemas from acp-spec sibling directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SPEC_SCHEMAS_DIR="$PROJECT_DIR/../acp-spec/schemas/v1"
LOCAL_SCHEMAS_DIR="$PROJECT_DIR/schemas/v1"

if [ ! -d "$SPEC_SCHEMAS_DIR" ]; then
  echo "Error: acp-spec schemas not found at $SPEC_SCHEMAS_DIR"
  echo "Please ensure the acp-spec directory exists as a sibling of acp-lsp"
  exit 1
fi

echo "Syncing schemas from acp-spec..."
mkdir -p "$LOCAL_SCHEMAS_DIR"
cp -v "$SPEC_SCHEMAS_DIR"/*.json "$LOCAL_SCHEMAS_DIR/"
echo "Schemas synced successfully!"