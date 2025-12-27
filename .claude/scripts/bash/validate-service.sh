#!/bin/bash
# Validate a service implementation
# Usage: validate-service.sh <service-name>

set -euo pipefail

SERVICE_NAME="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SERVICE_DIR="$PROJECT_ROOT/packages/server/src/services"

if [[ -z "$SERVICE_NAME" ]]; then
  echo "Usage: validate-service.sh <service-name>"
  exit 1
fi

SERVICE_FILE="$SERVICE_DIR/${SERVICE_NAME}.ts"
TEST_FILE="$SERVICE_DIR/${SERVICE_NAME}.test.ts"

echo "Validating service: $SERVICE_NAME"
echo "================================="

ERRORS=0

# Check file exists
if [[ ! -f "$SERVICE_FILE" ]]; then
  echo "❌ Service file not found: $SERVICE_FILE"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Service file exists"
fi

# Check test file exists
if [[ ! -f "$TEST_FILE" ]]; then
  echo "⚠️  Test file not found: $TEST_FILE"
else
  echo "✅ Test file exists"
fi

# TypeScript compilation check
if command -v npx &> /dev/null && [[ -f "$SERVICE_FILE" ]]; then
  echo "Checking TypeScript compilation..."
  if npx tsc --noEmit "$SERVICE_FILE" 2>/dev/null; then
    echo "✅ TypeScript compiles"
  else
    echo "❌ TypeScript compilation errors"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Run service tests
if [[ -f "$TEST_FILE" ]]; then
  echo "Running tests..."
  if npm test -- --testPathPattern="${SERVICE_NAME}" --passWithNoTests 2>/dev/null; then
    echo "✅ Tests pass"
  else
    echo "❌ Tests failing"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check required exports
if [[ -f "$SERVICE_FILE" ]]; then
  PASCAL_NAME="$(echo "$SERVICE_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')"
  if grep -q "export class ${PASCAL_NAME}Service" "$SERVICE_FILE"; then
    echo "✅ Service class exported"
  else
    echo "❌ Service class not exported: ${PASCAL_NAME}Service"
    ERRORS=$((ERRORS + 1))
  fi
fi

echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo "✅ Validation passed"
  exit 0
else
  echo "❌ Validation failed with $ERRORS error(s)"
  exit 1
fi
