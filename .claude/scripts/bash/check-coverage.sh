#!/bin/bash
# Check test coverage against targets
# Usage: check-coverage.sh [--json]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
JSON_OUTPUT=false

if [[ "${1:-}" == "--json" ]]; then
  JSON_OUTPUT=true
fi

cd "$PROJECT_ROOT"

# Coverage targets from requirements
declare -A TARGETS=(
  ["parsers/annotation"]=95
  ["services/variable"]=95
  ["services/constraint"]=90
  ["services/schema"]=90
  ["providers/diagnostics"]=90
  ["providers/completion"]=85
  ["providers/hover"]=85
  ["providers/definition"]=85
  ["providers/references"]=85
)

echo "Checking test coverage..."
echo "========================="

# Run coverage
npm run test:coverage 2>/dev/null || true

echo ""
echo "Coverage vs Targets"
echo "==================="

PASS_COUNT=0
FAIL_COUNT=0

for component in "${!TARGETS[@]}"; do
  target="${TARGETS[$component]}"
  # Extract coverage from lcov report (simplified)
  coverage=$(grep -A 4 "$component" coverage/lcov.info 2>/dev/null | grep "LF:" | head -1 | grep -oP '\d+' || echo "0")
  
  if [[ "$coverage" -ge "$target" ]]; then
    echo "✅ $component: ${coverage}% (target: ${target}%)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "❌ $component: ${coverage}% (target: ${target}%)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo ""
echo "Summary: $PASS_COUNT met targets, $FAIL_COUNT below targets"

if $JSON_OUTPUT; then
  echo "{\"passed\": $PASS_COUNT, \"failed\": $FAIL_COUNT}"
fi

[[ $FAIL_COUNT -eq 0 ]]
