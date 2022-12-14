import { defineConfig } from "vite";
import { umd as name } from "./package.json";

import dts from "vite-plugin-dts"; 
import glob from "tiny-glob";

export default defineConfig({
  plugins: [
    dts({
      outputDir: "@types"
    })
  ],
  build: {
    outDir: "lib",
    lib: {
      entry: await glob("src/*.ts"),
      name,
      formats: ["es", "cjs"],
      fileName(format, entryName) {
        switch (format) {
          case "es":
            return `${entryName}.mjs`;
          case "cjs":
            return `${entryName}.cjs`;
          default:
            return `${entryName}.js`;
        }
      },
    },
    rollupOptions: {
      output: {
        preserveModules: false
      }
    }
  },
});