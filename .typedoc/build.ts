// import { build } from "esbuild";

import { build } from 'vite'

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// await build({
//   entryPoints: [path.resolve(__dirname, "typedoc.tsx")],

//   "format": "cjs",
//   "outfile": path.resolve(__dirname, "typedoc.cjs")
// });


(async () => {
  await build({
    root: path.resolve(__dirname, './'),
    esbuild: {
      jsxFactory: "JSX.createElement",
      jsxFragment: "JSX.Fragment",
    },
    build: {
      outDir: "./",
      lib: {
        entry: "typedoc.tsx",
        formats: ["cjs"],
        fileName: "typedoc"   
      },
      rollupOptions: {
        external: ['typedoc']
      }
    }
  })
})()