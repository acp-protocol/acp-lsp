#!/bin/bash
# Generate a service from template
# Usage: generate-service.sh <service-name> [--enhance]

set -euo pipefail

SERVICE_NAME="${1:-}"
ENHANCE="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/../templates/services"
OUTPUT_DIR="$PROJECT_ROOT/packages/server/src/services"

if [[ -z "$SERVICE_NAME" ]]; then
  echo "Usage: generate-service.sh <service-name> [--enhance]"
  echo "Available services: variable, cache, schema, workspace"
  exit 1
fi

# Convert to PascalCase for class name
PASCAL_NAME="$(echo "$SERVICE_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')"

TEMPLATE_FILE="$TEMPLATES_DIR/${SERVICE_NAME}.ts.template"
OUTPUT_FILE="$OUTPUT_DIR/${SERVICE_NAME}.ts"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Error: Template not found: $TEMPLATE_FILE"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

if [[ "$ENHANCE" == "--enhance" && -f "$OUTPUT_FILE" ]]; then
  # Backup existing file and merge
  cp "$OUTPUT_FILE" "${OUTPUT_FILE}.bak"
  echo "Backed up existing file to ${OUTPUT_FILE}.bak"
  echo "Enhancing existing service..."
  # In real implementation, would merge templates
fi

# Process template
sed -e "s/{{SERVICE_NAME}}/$SERVICE_NAME/g" \
    -e "s/{{PASCAL_NAME}}/${PASCAL_NAME}Service/g" \
    -e "s/{{DATE}}/$(date -I)/g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo "Generated: $OUTPUT_FILE"

# Also generate test file
TEST_OUTPUT="$OUTPUT_DIR/${SERVICE_NAME}.test.ts"
TEST_TEMPLATE="$SCRIPT_DIR/../templates/test/service.test.ts.template"

if [[ -f "$TEST_TEMPLATE" ]]; then
  sed -e "s/{{SERVICE_NAME}}/$SERVICE_NAME/g" \
      -e "s/{{PASCAL_NAME}}/${PASCAL_NAME}Service/g" \
      "$TEST_TEMPLATE" > "$TEST_OUTPUT"
  echo "Generated: $TEST_OUTPUT"
fi

# JSON output for automation
if [[ "${3:-}" == "--json" ]] || [[ "${2:-}" == "--json" ]]; then
  echo "{\"service\": \"$SERVICE_NAME\", \"output\": \"$OUTPUT_FILE\", \"test\": \"$TEST_OUTPUT\"}"
fi
