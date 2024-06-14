import { defineConfig } from 'tsup';

export default defineConfig({
  target: ["es2022", "node20", "chrome115"],
  entry: ['src/*.ts'],
  format: ["esm", "cjs", "iife"],
  sourcemap: true,
  clean: true,
  dts: false,
  outDir: "lib",
})