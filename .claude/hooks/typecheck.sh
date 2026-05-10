#!/bin/bash
set -euo pipefail

f=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')
echo "$f" | grep -qE 'src/.*\.tsx?$' || exit 0

errors=$(cd "${CLAUDE_PROJECT_DIR:-.}" && npm run type-check 2>&1 | grep '^src/' | head -20 || true)
[ -z "$errors" ] && exit 0

jq -n --arg ctx "TypeScript errors in src/:
$errors" \
  '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":$ctx}}'
