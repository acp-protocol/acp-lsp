#!/bin/bash
# Conduct phase gate review
# Usage: review-phase.sh <phase-number>

set -euo pipefail

PHASE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

if [[ -z "$PHASE" ]]; then
  echo "Usage: review-phase.sh <phase-number>"
  echo "Phases: 1 (Foundation), 2 (Intelligence), 3 (Navigation), 4 (Advanced), 5 (Polish)"
  exit 1
fi

echo "# Phase $PHASE Gate Review"
echo "**Date:** $(date -Iseconds)"
echo ""

# Define deliverables per phase
declare -A PHASE_DELIVERABLES
PHASE_DELIVERABLES[1]="server.ts documents/manager.ts parsers/typescript.ts parsers/javascript.ts services/schemaValidator.ts providers/diagnostics.ts"
PHASE_DELIVERABLES[2]="parsers/python.ts parsers/rust.ts parsers/go.ts parsers/java.ts parsers/csharp.ts parsers/cpp.ts providers/completion.ts providers/hover.ts services/variable.ts"
PHASE_DELIVERABLES[3]="providers/definition.ts providers/references.ts providers/symbols.ts services/cache.ts"
PHASE_DELIVERABLES[4]="providers/codeActions.ts providers/semanticTokens.ts providers/codeLens.ts providers/inlayHints.ts"
PHASE_DELIVERABLES[5]="extension/package.json docs/README.md"

DELIVERABLES="${PHASE_DELIVERABLES[$PHASE]:-}"

if [[ -z "$DELIVERABLES" ]]; then
  echo "Unknown phase: $PHASE"
  exit 1
fi

cd "$PROJECT_ROOT"
SRC_DIR="packages/server/src"

echo "## Deliverable Status"
echo ""
echo "| Deliverable | Status |"
echo "|-------------|--------|"

MISSING=0
PRESENT=0

for file in $DELIVERABLES; do
  if [[ -f "$SRC_DIR/$file" ]] || [[ -f "$file" ]]; then
    echo "| $file | ✅ |"
    PRESENT=$((PRESENT + 1))
  else
    echo "| $file | ❌ Missing |"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
echo "## Test Results"
echo ""

# Run tests
if npm test 2>/dev/null; then
  echo "✅ All tests passing"
  TESTS_PASS=true
else
  echo "❌ Tests failing"
  TESTS_PASS=false
fi

echo ""
echo "## Coverage"
echo ""

# Check coverage
if npm run test:coverage 2>/dev/null; then
  COVERAGE=$(grep "All files" coverage/lcov-report/index.html 2>/dev/null | grep -oP '\d+(?=%)' | head -1 || echo "N/A")
  echo "Coverage: ${COVERAGE}%"
else
  COVERAGE="N/A"
  echo "Coverage: Not available"
fi

echo ""
echo "## Summary"
echo ""
echo "| Metric | Value |"
echo "|--------|-------|"
echo "| Deliverables | $PRESENT / $((PRESENT + MISSING)) |"
echo "| Tests | $([ "$TESTS_PASS" = true ] && echo "✅ Pass" || echo "❌ Fail") |"
echo "| Coverage | ${COVERAGE}% |"

echo ""
echo "## Decision"
echo ""

if [[ $MISSING -eq 0 && "$TESTS_PASS" = true ]]; then
  echo "**GO** - Phase $PHASE complete. Proceed to Phase $((PHASE + 1))."
  exit 0
else
  echo "**NO-GO** - Address the following blockers:"
  [[ $MISSING -gt 0 ]] && echo "- $MISSING missing deliverable(s)"
  [[ "$TESTS_PASS" = false ]] && echo "- Tests failing"
  exit 1
fi
