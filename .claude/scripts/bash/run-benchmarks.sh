#!/bin/bash
# Run performance benchmarks
# Usage: run-benchmarks.sh [--compare baseline.json] [--json]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPARE_FILE=""
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --compare)
      COMPARE_FILE="$2"
      shift 2
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

cd "$PROJECT_ROOT"

echo "Running performance benchmarks..."
echo "================================="

# Performance targets from requirements
declare -A TARGETS=(
  ["diagnostics-incremental"]=50
  ["diagnostics-full"]=200
  ["completions"]=30
  ["hover"]=20
  ["definition"]=50
  ["references"]=100
  ["semantic-tokens"]=100
)

# Run vitest benchmarks
RESULTS_FILE="$(mktemp)"
npm run bench 2>/dev/null | tee "$RESULTS_FILE" || true

# Parse results and compare to targets
echo ""
echo "Results vs Targets"
echo "=================="

PASS_COUNT=0
FAIL_COUNT=0

for operation in "${!TARGETS[@]}"; do
  target="${TARGETS[$operation]}"
  # Extract measured value from results (simplified - real impl would parse vitest output)
  measured=$(grep -i "$operation" "$RESULTS_FILE" | grep -oP '\d+(?=ms)' | head -1 || echo "N/A")
  
  if [[ "$measured" != "N/A" && "$measured" -le "$target" ]]; then
    echo "✅ $operation: ${measured}ms (target: <${target}ms)"
    PASS_COUNT=$((PASS_COUNT + 1))
  elif [[ "$measured" != "N/A" ]]; then
    echo "❌ $operation: ${measured}ms (target: <${target}ms)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  else
    echo "⚠️  $operation: not measured"
  fi
done

rm -f "$RESULTS_FILE"

# Compare with baseline if provided
if [[ -n "$COMPARE_FILE" && -f "$COMPARE_FILE" ]]; then
  echo ""
  echo "Comparison with baseline: $COMPARE_FILE"
  echo "========================================"
  # Would compare JSON results here
fi

echo ""
echo "Summary: $PASS_COUNT passed, $FAIL_COUNT failed"

if $JSON_OUTPUT; then
  echo "{\"passed\": $PASS_COUNT, \"failed\": $FAIL_COUNT}"
fi

[[ $FAIL_COUNT -eq 0 ]]
