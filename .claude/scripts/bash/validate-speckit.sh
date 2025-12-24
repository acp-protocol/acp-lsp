#!/bin/bash
#
# validate-speckit.sh
# Validate the SpecKit package structure and content
#
# Usage:
#   ./validate-speckit.sh
#   ./validate-speckit.sh --json
#   ./validate-speckit.sh --strict
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECKIT_ROOT="${SPECKIT_ROOT:-$(dirname "$(dirname "$SCRIPT_DIR")")}"

OUTPUT_FORMAT="text"
STRICT_MODE=false

errors=()
warnings=()
info=()

usage() {
  echo "Usage: $0 [--json] [--strict]"
  echo ""
  echo "Options:"
  echo "  --json    Output results as JSON"
  echo "  --strict  Treat warnings as errors"
  echo "  --help    Show this help"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --json) OUTPUT_FORMAT="json"; shift ;;
    --strict) STRICT_MODE=true; shift ;;
    --help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

# Check required directories
check_directories() {
  local required_dirs=("commands" "scripts" "templates" "memory")
  for dir in "${required_dirs[@]}"; do
    if [[ ! -d "$SPECKIT_ROOT/$dir" ]]; then
      errors+=("Missing required directory: $dir")
    else
      info+=("Found directory: $dir")
    fi
  done
}

# Check command files have valid YAML frontmatter
check_commands() {
  local cmd_count=0
  local valid_count=0
  
  while IFS= read -r -d '' file; do
    cmd_count=$((cmd_count + 1))
    
    # Check for YAML frontmatter
    if head -1 "$file" | grep -q '^---$'; then
      # Check for required fields
      if grep -q '^name:' "$file" && grep -q '^description:' "$file"; then
        valid_count=$((valid_count + 1))
      else
        warnings+=("Command missing required fields: ${file#$SPECKIT_ROOT/}")
      fi
    else
      errors+=("Command missing YAML frontmatter: ${file#$SPECKIT_ROOT/}")
    fi
    
    # Check for handoffs
    if ! grep -q 'handoffs:' "$file"; then
      warnings+=("Command missing handoffs section: ${file#$SPECKIT_ROOT/}")
    fi
  done < <(find "$SPECKIT_ROOT/commands" -name "*.md" -print0 2>/dev/null)
  
  info+=("Commands checked: $cmd_count ($valid_count valid)")
}

# Check scripts are executable and have --json support
check_scripts() {
  local script_count=0
  
  while IFS= read -r -d '' file; do
    script_count=$((script_count + 1))
    
    if [[ ! -x "$file" ]]; then
      warnings+=("Script not executable: ${file#$SPECKIT_ROOT/}")
    fi
    
    if ! grep -q '\-\-json' "$file"; then
      warnings+=("Script missing --json support: ${file#$SPECKIT_ROOT/}")
    fi
  done < <(find "$SPECKIT_ROOT/scripts" -name "*.sh" -print0 2>/dev/null)
  
  info+=("Scripts checked: $script_count")
}

# Check templates exist
check_templates() {
  local template_count=0
  
  template_count=$(find "$SPECKIT_ROOT/templates" -type f 2>/dev/null | wc -l)
  
  if [[ $template_count -eq 0 ]]; then
    warnings+=("No templates found")
  else
    info+=("Templates found: $template_count")
  fi
}

# Check memory files
check_memory() {
  local required_memory=("project-context.md" "phase-status.md" "assumptions-log.md")
  
  for mem in "${required_memory[@]}"; do
    if [[ ! -f "$SPECKIT_ROOT/memory/$mem" ]]; then
      errors+=("Missing required memory file: $mem")
    else
      info+=("Found memory file: $mem")
    fi
  done
}

# Check README exists
check_readme() {
  if [[ ! -f "$SPECKIT_ROOT/README.md" ]]; then
    errors+=("Missing README.md")
  else
    info+=("Found README.md")
  fi
}

# Run all checks
check_directories
check_commands
check_scripts
check_templates
check_memory
check_readme

# Determine status
status="valid"
exit_code=0

if [[ ${#errors[@]} -gt 0 ]]; then
  status="invalid"
  exit_code=1
elif [[ ${#warnings[@]} -gt 0 ]]; then
  if [[ "$STRICT_MODE" == true ]]; then
    status="invalid"
    exit_code=1
  else
    status="warnings"
  fi
fi

# Output results
if [[ "$OUTPUT_FORMAT" == "json" ]]; then
  errors_json=$(printf '%s\n' "${errors[@]}" 2>/dev/null | jq -R . | jq -s . || echo '[]')
  warnings_json=$(printf '%s\n' "${warnings[@]}" 2>/dev/null | jq -R . | jq -s . || echo '[]')
  info_json=$(printf '%s\n' "${info[@]}" 2>/dev/null | jq -R . | jq -s . || echo '[]')
  
  cat <<EOF
{
  "status": "$status",
  "strict_mode": $STRICT_MODE,
  "root": "$SPECKIT_ROOT",
  "errors": $errors_json,
  "warnings": $warnings_json,
  "info": $info_json,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
else
  echo "SpecKit Validation Results"
  echo "=========================="
  echo "Root: $SPECKIT_ROOT"
  echo "Status: $status"
  echo ""
  
  if [[ ${#errors[@]} -gt 0 ]]; then
    echo "✗ Errors:"
    for e in "${errors[@]}"; do
      echo "  - $e"
    done
    echo ""
  fi
  
  if [[ ${#warnings[@]} -gt 0 ]]; then
    echo "⚠ Warnings:"
    for w in "${warnings[@]}"; do
      echo "  - $w"
    done
    echo ""
  fi
  
  if [[ ${#info[@]} -gt 0 ]]; then
    echo "ℹ Info:"
    for i in "${info[@]}"; do
      echo "  - $i"
    done
  fi
fi

exit $exit_code
