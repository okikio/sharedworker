import { defineConfig } from 'tsup';

export default defineConfig({
  target: ["es2022", "node20"],
  entry: ['src/index.ts'],
  format: ["esm", "cjs"],
  sourcemap: true,
  clean: true,
  dts: true,
  outDir: "lib",
})