#!/bin/bash
#
# sync-schemas.sh
# Sync JSON schemas from acp-spec to local project
#
# Usage:
#   ./sync-schemas.sh
#   ./sync-schemas.sh --json
#   ./sync-schemas.sh --check (verify only, don't copy)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")}"
SPEC_SCHEMAS="${SPEC_SCHEMAS:-$PROJECT_ROOT/../acp-spec/schemas/v1}"
LOCAL_SCHEMAS="$PROJECT_ROOT/schemas/v1"

OUTPUT_FORMAT="text"
CHECK_ONLY=false

# Schema files to sync
SCHEMAS=(
  "cache.schema.json"
  "config.schema.json"
  "vars.schema.json"
  "attempts.schema.json"
  "sync.schema.json"
  "primer.schema.json"
)

usage() {
  echo "Usage: $0 [--json] [--check]"
  echo ""
  echo "Options:"
  echo "  --json   Output results as JSON"
  echo "  --check  Verify schemas match without copying"
  echo "  --help   Show this help"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --json)
      OUTPUT_FORMAT="json"
      shift
      ;;
    --check)
      CHECK_ONLY=true
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

# Verify source directory exists
if [[ ! -d "$SPEC_SCHEMAS" ]]; then
  if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    cat <<EOF
{
  "status": "error",
  "message": "Source schema directory not found",
  "source": "$SPEC_SCHEMAS",
  "suggestion": "Clone acp-spec as sibling directory"
}
EOF
  else
    echo "Error: Schema source directory not found: $SPEC_SCHEMAS"
    echo "Make sure acp-spec is cloned as a sibling directory."
  fi
  exit 1
fi

# Create target directory if syncing
if [[ "$CHECK_ONLY" == false ]]; then
  mkdir -p "$LOCAL_SCHEMAS"
fi

synced=()
missing=()
outdated=()
errors=()

for schema in "${SCHEMAS[@]}"; do
  source_file="$SPEC_SCHEMAS/$schema"
  local_file="$LOCAL_SCHEMAS/$schema"
  
  if [[ ! -f "$source_file" ]]; then
    missing+=("$schema")
    continue
  fi
  
  if [[ "$CHECK_ONLY" == true ]]; then
    if [[ -f "$local_file" ]]; then
      if ! diff -q "$source_file" "$local_file" > /dev/null 2>&1; then
        outdated+=("$schema")
      else
        synced+=("$schema")
      fi
    else
      outdated+=("$schema")
    fi
  else
    if cp "$source_file" "$local_file" 2>/dev/null; then
      synced+=("$schema")
    else
      errors+=("$schema")
    fi
  fi
done

# Output results
if [[ "$OUTPUT_FORMAT" == "json" ]]; then
  synced_json=$(printf '%s\n' "${synced[@]}" 2>/dev/null | jq -R . | jq -s . || echo '[]')
  missing_json=$(printf '%s\n' "${missing[@]}" 2>/dev/null | jq -R . | jq -s . || echo '[]')
  outdated_json=$(printf '%s\n' "${outdated[@]}" 2>/dev/null | jq -R . | jq -s . || echo '[]')
  errors_json=$(printf '%s\n' "${errors[@]}" 2>/dev/null | jq -R . | jq -s . || echo '[]')
  
  status="success"
  if [[ ${#missing[@]} -gt 0 ]] || [[ ${#errors[@]} -gt 0 ]]; then
    status="error"
  elif [[ ${#outdated[@]} -gt 0 ]]; then
    status="outdated"
  fi
  
  cat <<EOF
{
  "status": "$status",
  "check_only": $CHECK_ONLY,
  "source": "$SPEC_SCHEMAS",
  "target": "$LOCAL_SCHEMAS",
  "synced": $synced_json,
  "missing": $missing_json,
  "outdated": $outdated_json,
  "errors": $errors_json,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
else
  if [[ "$CHECK_ONLY" == true ]]; then
    echo "Schema Check Results"
  else
    echo "Schema Sync Results"
  fi
  echo "===================="
  echo "Source: $SPEC_SCHEMAS"
  echo "Target: $LOCAL_SCHEMAS"
  echo ""
  
  if [[ ${#synced[@]} -gt 0 ]]; then
    echo "✓ Synced/Up-to-date:"
    for s in "${synced[@]}"; do
      echo "  - $s"
    done
    echo ""
  fi
  
  if [[ ${#outdated[@]} -gt 0 ]]; then
    echo "⚠ Outdated (needs sync):"
    for s in "${outdated[@]}"; do
      echo "  - $s"
    done
    echo ""
  fi
  
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "✗ Missing from source:"
    for s in "${missing[@]}"; do
      echo "  - $s"
    done
    echo ""
  fi
  
  if [[ ${#errors[@]} -gt 0 ]]; then
    echo "✗ Errors:"
    for s in "${errors[@]}"; do
      echo "  - $s"
    done
    echo ""
  fi
  
  if [[ "$CHECK_ONLY" == false ]]; then
    echo "Sync complete: ${#synced[@]}/${#SCHEMAS[@]} schemas"
  fi
fi

# Exit with error if any issues
if [[ ${#missing[@]} -gt 0 ]] || [[ ${#errors[@]} -gt 0 ]]; then
  exit 1
fi

if [[ "$CHECK_ONLY" == true ]] && [[ ${#outdated[@]} -gt 0 ]]; then
  exit 1
fi

exit 0
