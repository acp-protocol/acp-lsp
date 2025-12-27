#!/bin/bash
# Generate test files for providers/services
# Usage: generate-tests.sh <name> [--integration]

set -euo pipefail

NAME="${1:-}"
INTEGRATION=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/../templates/test"

if [[ "${2:-}" == "--integration" ]]; then
  INTEGRATION=true
fi

if [[ -z "$NAME" && "$INTEGRATION" == false ]]; then
  echo "Usage: generate-tests.sh <provider-or-service-name> [--integration]"
  exit 1
fi

if $INTEGRATION; then
  echo "Generating integration test harness..."
  
  OUTPUT_DIR="$PROJECT_ROOT/packages/server/src/__integration__"
  mkdir -p "$OUTPUT_DIR"
  
  # Generate harness
  cat > "$OUTPUT_DIR/harness.ts" << 'EOF'
import { spawn, ChildProcess } from 'child_process';
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  MessageConnection,
} from 'vscode-languageserver/node';

export class LSPTestHarness {
  private process: ChildProcess | null = null;
  private connection: MessageConnection | null = null;

  async start(): Promise<MessageConnection> {
    this.process = spawn('node', ['./dist/server.js', '--stdio']);
    
    this.connection = createMessageConnection(
      new StreamMessageReader(this.process.stdout!),
      new StreamMessageWriter(this.process.stdin!)
    );

    this.connection.listen();
    
    await this.connection.sendRequest('initialize', {
      processId: process.pid,
      capabilities: {},
      rootUri: 'file:///test-workspace',
    });

    await this.connection.sendNotification('initialized');
    
    return this.connection;
  }

  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.sendRequest('shutdown');
      this.connection.sendNotification('exit');
      this.connection.dispose();
    }
    
    if (this.process) {
      this.process.kill();
    }
  }
}
EOF

  echo "Generated: $OUTPUT_DIR/harness.ts"
  
  # Generate sample integration test
  cat > "$OUTPUT_DIR/lifecycle.test.ts" << 'EOF'
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LSPTestHarness } from './harness';
import { MessageConnection } from 'vscode-languageserver/node';

describe('Document Lifecycle', () => {
  let harness: LSPTestHarness;
  let connection: MessageConnection;

  beforeAll(async () => {
    harness = new LSPTestHarness();
    connection = await harness.start();
  });

  afterAll(async () => {
    await harness.stop();
  });

  it('should handle document open', async () => {
    await connection.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        text: '// @acp:lock frozen - Do not modify',
      },
    });
    // Verify no errors thrown
    expect(true).toBe(true);
  });
});
EOF

  echo "Generated: $OUTPUT_DIR/lifecycle.test.ts"
  
else
  PASCAL_NAME="$(echo "$NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')"
  
  # Check if it's a provider or service
  if [[ -f "$PROJECT_ROOT/packages/server/src/providers/${NAME}.ts" ]]; then
    OUTPUT_FILE="$PROJECT_ROOT/packages/server/src/providers/${NAME}.test.ts"
    TEMPLATE="$TEMPLATES_DIR/provider.test.ts.template"
    TYPE="Provider"
  elif [[ -f "$PROJECT_ROOT/packages/server/src/services/${NAME}.ts" ]]; then
    OUTPUT_FILE="$PROJECT_ROOT/packages/server/src/services/${NAME}.test.ts"
    TEMPLATE="$TEMPLATES_DIR/service.test.ts.template"
    TYPE="Service"
  else
    echo "Error: Could not find provider or service: $NAME"
    exit 1
  fi
  
  if [[ -f "$TEMPLATE" ]]; then
    sed -e "s/{{NAME}}/$NAME/g" \
        -e "s/{{PASCAL_NAME}}/$PASCAL_NAME/g" \
        -e "s/{{TYPE}}/$TYPE/g" \
        "$TEMPLATE" > "$OUTPUT_FILE"
    echo "Generated: $OUTPUT_FILE"
  else
    echo "Error: Template not found: $TEMPLATE"
    exit 1
  fi
fi
