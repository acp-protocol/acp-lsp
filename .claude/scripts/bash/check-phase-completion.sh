#!/bin/bash
#
# check-phase-completion.sh
# Verify phase completion status for ACP LSP development
#
# Usage:
#   ./check-phase-completion.sh --phase 1
#   ./check-phase-completion.sh --phase 2 --json
#   ./check-phase-completion.sh --all
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")}"

OUTPUT_FORMAT="text"
PHASE=""
CHECK_ALL=false

# Phase definitions: "path:description"
declare -A PHASE_NAMES=(
  [1]="Foundation"
  [2]="Core Intelligence"
  [3]="Navigation"
  [4]="Advanced Features"
  [5]="Polish"
)

# Phase 1 deliverables
PHASE1_DELIVERABLES=(
  "packages/server/src/server.ts:Server scaffolding"
  "packages/server/src/capabilities.ts:Capability declaration"
  "packages/server/src/documents/manager.ts:Document manager"
  "packages/server/src/documents/sync.ts:Document sync handler"
  "packages/server/src/parsers/annotation-parser.ts:Annotation parser"
  "packages/server/src/services/schema-validator.ts:Schema validation"
  "packages/server/src/providers/diagnostics.ts:Diagnostics provider"
  "packages/server/src/utils/logger.ts:Logger utility"
)

# Phase 2 deliverables
PHASE2_DELIVERABLES=(
  "packages/server/src/parsers/languages/typescript.ts:TypeScript parser"
  "packages/server/src/parsers/languages/python.ts:Python parser"
  "packages/server/src/parsers/languages/rust.ts:Rust parser"
  "packages/server/src/parsers/languages/go.ts:Go parser"
  "packages/server/src/parsers/languages/java.ts:Java parser"
  "packages/server/src/parsers/languages/csharp.ts:C# parser"
  "packages/server/src/parsers/languages/cpp.ts:C++ parser"
  "packages/server/src/providers/completion.ts:Completion provider"
  "packages/server/src/providers/hover.ts:Hover provider"
  "packages/server/src/services/variable-resolver.ts:Variable resolver"
)

# Phase 3 deliverables
PHASE3_DELIVERABLES=(
  "packages/server/src/providers/definition.ts:Definition provider"
  "packages/server/src/providers/references.ts:References provider"
  "packages/server/src/providers/symbols.ts:Symbol provider"
  "packages/server/src/services/cache-manager.ts:Cache manager"
)

# Phase 4 deliverables
PHASE4_DELIVERABLES=(
  "packages/server/src/providers/code-actions.ts:Code actions provider"
  "packages/server/src/providers/semantic-tokens.ts:Semantic tokens"
  "packages/server/src/providers/code-lens.ts:Code lens provider"
  "packages/server/src/providers/inlay-hints.ts:Inlay hints"
)

# Phase 5 deliverables
PHASE5_DELIVERABLES=(
  "packages/client/src/extension.ts:VS Code extension"
  "packages/client/package.json:Extension manifest"
  "docs/architecture.md:Architecture documentation"
  "CHANGELOG.md:Changelog"
)

usage() {
  echo "Usage: $0 --phase <1-5> [--json]"
  echo "       $0 --all [--json]"
  echo ""
  echo "Options:"
  echo "  --phase <n>  Check specific phase (1-5)"
  echo "  --all        Check all phases"
  echo "  --json       Output as JSON"
  echo "  --help       Show this help"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --phase)
      PHASE="$2"
      shift 2
      ;;
    --all)
      CHECK_ALL=true
      shift
      ;;
    --json)
      OUTPUT_FORMAT="json"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$PHASE" && "$CHECK_ALL" == "false" ]]; then
  echo "Error: --phase or --all is required" >&2
  usage
  exit 1
fi

# Get deliverables for a phase
get_deliverables() {
  local phase=$1
  case $phase in
    1) echo "${PHASE1_DELIVERABLES[@]}" ;;
    2) echo "${PHASE2_DELIVERABLES[@]}" ;;
    3) echo "${PHASE3_DELIVERABLES[@]}" ;;
    4) echo "${PHASE4_DELIVERABLES[@]}" ;;
    5) echo "${PHASE5_DELIVERABLES[@]}" ;;
    *) echo "" ;;
  esac
}

# Check if file exists
check_file() {
  local file_path="$PROJECT_ROOT/$1"
  [[ -f "$file_path" ]]
}

# Check a single phase
check_phase() {
  local phase=$1
  local -a complete=()
  local -a incomplete=()
  
  local deliverables
  deliverables=$(get_deliverables "$phase")
  
  for item in $deliverables; do
    IFS=':' read -r path description <<< "$item"
    if check_file "$path"; then
      complete+=("$description")
    else
      incomplete+=("$description|$path")
    fi
  done
  
  local complete_count=${#complete[@]}
  local incomplete_count=${#incomplete[@]}
  local total_count=$((complete_count + incomplete_count))
  local percentage=0
  
  if [[ $total_count -gt 0 ]]; then
    percentage=$((complete_count * 100 / total_count))
  fi
  
  local status="not_started"
  if [[ $complete_count -eq $total_count ]]; then
    status="complete"
  elif [[ $complete_count -gt 0 ]]; then
    status="in_progress"
  fi
  
  if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    local complete_json incomplete_json
    complete_json=$(printf '%s\n' "${complete[@]}" 2>/dev/null | jq -R . | jq -s . || echo '[]')
    incomplete_json=$(printf '%s\n' "${incomplete[@]}" 2>/dev/null | jq -R . | jq -s . || echo '[]')
    
    cat <<EOF
{
  "phase": $phase,
  "name": "${PHASE_NAMES[$phase]}",
  "status": "$status",
  "completed": $complete_count,
  "total": $total_count,
  "percentage": $percentage,
  "complete": $complete_json,
  "incomplete": $incomplete_json
}
EOF
  else
    echo "Phase $phase: ${PHASE_NAMES[$phase]}"
    echo "Status: $status"
    echo "Progress: $complete_count / $total_count ($percentage%)"
    echo ""
    
    if [[ ${#complete[@]} -gt 0 ]]; then
      echo "✓ Completed:"
      for item in "${complete[@]}"; do
        echo "  - $item"
      done
      echo ""
    fi
    
    if [[ ${#incomplete[@]} -gt 0 ]]; then
      echo "☐ Remaining:"
      for item in "${incomplete[@]}"; do
        IFS='|' read -r desc path <<< "$item"
        echo "  - $desc"
        echo "    → $path"
      done
    fi
  fi
}

# Main execution
if [[ "$CHECK_ALL" == "true" ]]; then
  if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    echo "{"
    echo '  "phases": ['
    for p in 1 2 3 4 5; do
      check_phase "$p"
      [[ $p -lt 5 ]] && echo ","
    done
    echo "  ],"
    echo '  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"'
    echo "}"
  else
    for p in 1 2 3 4 5; do
      check_phase "$p"
      echo "---"
    done
  fi
else
  check_phase "$PHASE"
fi
