#!/bin/bash
# Generate a provider from template
# Usage: generate-provider.sh <provider-name>

set -euo pipefail

PROVIDER_NAME="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/../templates/providers"
OUTPUT_DIR="$PROJECT_ROOT/packages/server/src/providers"

if [[ -z "$PROVIDER_NAME" ]]; then
  echo "Usage: generate-provider.sh <provider-name>"
  echo "Available providers: hover, definition, references, symbols, codeActions, semanticTokens, codeLens, inlayHints"
  exit 1
fi

# Convert to PascalCase for class name
PASCAL_NAME="$(echo "$PROVIDER_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')"

TEMPLATE_FILE="$TEMPLATES_DIR/${PROVIDER_NAME}.ts.template"
OUTPUT_FILE="$OUTPUT_DIR/${PROVIDER_NAME}.ts"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Error: Template not found: $TEMPLATE_FILE"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Process template
sed -e "s/{{PROVIDER_NAME}}/$PROVIDER_NAME/g" \
    -e "s/{{PASCAL_NAME}}/${PASCAL_NAME}Provider/g" \
    -e "s/{{DATE}}/$(date -I)/g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo "Generated: $OUTPUT_FILE"

# Also generate test file
TEST_OUTPUT="$OUTPUT_DIR/${PROVIDER_NAME}.test.ts"
TEST_TEMPLATE="$SCRIPT_DIR/../templates/test/provider.test.ts.template"

if [[ -f "$TEST_TEMPLATE" ]]; then
  sed -e "s/{{PROVIDER_NAME}}/$PROVIDER_NAME/g" \
      -e "s/{{PASCAL_NAME}}/${PASCAL_NAME}Provider/g" \
      "$TEST_TEMPLATE" > "$TEST_OUTPUT"
  echo "Generated: $TEST_OUTPUT"
fi

# JSON output for automation
if [[ "${2:-}" == "--json" ]]; then
  echo "{\"provider\": \"$PROVIDER_NAME\", \"output\": \"$OUTPUT_FILE\", \"test\": \"$TEST_OUTPUT\"}"
fi
