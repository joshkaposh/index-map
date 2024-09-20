import { defineConfig } from "vite";
import { resolve } from 'path'

export default defineConfig({
    plugins: [],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'IndexMap',
            // the proper extensions will be added
            fileName: 'index-map',
          },
    }
})