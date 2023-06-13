import { resolve } from 'node:path'

import preact from "@preact/preset-vite";
import { defineConfig } from 'vite'
// import EsLint from 'vite-plugin-linter'
// const { EsLinter, linterPlugin } = EsLint
import * as packageJson from './package.json'

// https://vitejs.dev/config/
export default defineConfig((configEnv) => ({
  plugins: [
    preact(),
    // linterPlugin({
    //   include: ['./src}/**/*.{ts,tsx}'],
    //   linters: [new EsLinter({ configEnv })],
    // }),
  ],
  build: {
    lib: {
     // TODO: pkg.source ... or simila r?
      entry: resolve('src', 'index.js'),
      name: packageJson.name,
      formats: ['es'],
      // fileName: (format) => `${packageJson.name}.${format}.js`,
      fileName: (format) => `index.js`,
    },
    rollupOptions: {
      external: [...Object.keys(packageJson.peerDependencies)],
    },
  },
}))