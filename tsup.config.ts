import { defineConfig } from 'tsup';

export default defineConfig({
  target: ["es2022", "node21", "chrome105"],
  entry: ['src/index.ts'],
  format: ["esm", "cjs"],
  sourcemap: true,
  clean: true,
  dts: true,
  outDir: "lib",
})