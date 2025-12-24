import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    compilerOptions: {
      composite: false,
      declaration: true,
      declarationMap: true,
    },
  },
  clean: true,
  sourcemap: true,
  tsconfig: 'tsconfig.build.json',
})