/**
 * @acp:category("entry-point")
 * @acp:agent-instructions("VS Code extension entry point. Handles activation, language client lifecycle, and command registration.")
 */

import * as path from 'path'
import { ExtensionContext, workspace } from 'vscode'
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node'

let client: LanguageClient | undefined

export function activate(context: ExtensionContext): void {
  // Path to the server module
  const serverModule = context.asAbsolutePath(path.join('..', 'server', 'dist', 'server.js'))

  // Server options - run in Node
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009'],
      },
    },
  }

  // Client options
  const clientOptions: LanguageClientOptions = {
    // Register the server for supported languages
    documentSelector: [
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'python' },
      { scheme: 'file', language: 'rust' },
      { scheme: 'file', language: 'go' },
      { scheme: 'file', language: 'java' },
      { scheme: 'file', language: 'csharp' },
      { scheme: 'file', language: 'cpp' },
      { scheme: 'file', pattern: '**/.acp.config.json' },
      { scheme: 'file', pattern: '**/.acp.cache.json' },
    ],
    synchronize: {
      // Watch for ACP config file changes
      fileEvents: workspace.createFileSystemWatcher('**/.acp.{config,cache}.json'),
    },
  }

  // Create the language client
  client = new LanguageClient(
    'acpLanguageServer',
    'ACP Language Server',
    serverOptions,
    clientOptions
  )

  // Start the client (also launches the server)
  client.start()
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined
  }
  return client.stop()
}