#!/bin/bash
# Validate a provider implementation
# Usage: validate-provider.sh <provider-name>

set -euo pipefail

PROVIDER_NAME="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PROVIDER_DIR="$PROJECT_ROOT/packages/server/src/providers"

if [[ -z "$PROVIDER_NAME" ]]; then
  echo "Usage: validate-provider.sh <provider-name>"
  exit 1
fi

PROVIDER_FILE="$PROVIDER_DIR/${PROVIDER_NAME}.ts"
TEST_FILE="$PROVIDER_DIR/${PROVIDER_NAME}.test.ts"

echo "Validating provider: $PROVIDER_NAME"
echo "=================================="

ERRORS=0

# Check file exists
if [[ ! -f "$PROVIDER_FILE" ]]; then
  echo "❌ Provider file not found: $PROVIDER_FILE"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Provider file exists"
fi

# Check test file exists
if [[ ! -f "$TEST_FILE" ]]; then
  echo "⚠️  Test file not found: $TEST_FILE"
else
  echo "✅ Test file exists"
fi

# TypeScript compilation check
if command -v npx &> /dev/null && [[ -f "$PROVIDER_FILE" ]]; then
  echo "Checking TypeScript compilation..."
  if npx tsc --noEmit "$PROVIDER_FILE" 2>/dev/null; then
    echo "✅ TypeScript compiles"
  else
    echo "❌ TypeScript compilation errors"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Run provider tests
if [[ -f "$TEST_FILE" ]]; then
  echo "Running tests..."
  if npm test -- --testPathPattern="${PROVIDER_NAME}" --passWithNoTests 2>/dev/null; then
    echo "✅ Tests pass"
  else
    echo "❌ Tests failing"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check required exports
if [[ -f "$PROVIDER_FILE" ]]; then
  PASCAL_NAME="$(echo "$PROVIDER_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')"
  if grep -q "export class ${PASCAL_NAME}Provider" "$PROVIDER_FILE"; then
    echo "✅ Provider class exported"
  else
    echo "❌ Provider class not exported: ${PASCAL_NAME}Provider"
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
