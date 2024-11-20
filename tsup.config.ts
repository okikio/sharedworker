import type { Options } from 'tsup';
import { defineConfig } from 'tsup';
import { umdWrapper } from 'esbuild-plugin-umd-wrapper';

import { umd } from "./package.json";

const GLOBAL_NAME = umd;

const baseConfig: Options = {
  target: ["es2022", "node21", "chrome105"],
  entry: ['src/index.ts', 'src/polyfill.ts', 'src/ponyfill.ts', 'src/constants.ts'],
  format: ["esm", "cjs"],
  sourcemap: true,
  clean: true,
  dts: true,
  outDir: "lib",
  platform: 'browser',
  globalName: GLOBAL_NAME,

  outExtension({ format, options }) {
    const ext = ({ "esm": "js", "cjs": "cjs", "umd": "umd.js" })[format]
    const outputExtension = options.minify ? `min.${ext}` : `${ext}`
    return {
      js: `.${outputExtension}`,
    }
  },
}

export default defineConfig([
  { ...baseConfig },
  {
    ...baseConfig,
    target: 'es5',
    format: ['cjs'],

    outExtension({ format, options }) {
      const ext = "umd.js"
      const outputExtension = options.minify ? `min.${ext}` : `${ext}`
      return {
        js: `.${outputExtension}`,
      }
    },
    esbuildPlugins: [umdWrapper({ libraryName: GLOBAL_NAME, external: 'inherit' })],
  },
])