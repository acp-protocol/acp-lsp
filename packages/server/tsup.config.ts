import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  dts: {
    resolve: true,
  },
  clean: true,
  sourcemap: true,
  target: 'es2022',
  external: ['@acp-lsp/shared'],
  outDir: 'dist',
  tsconfig: 'tsconfig.build.json',
})