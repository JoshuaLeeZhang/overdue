import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    entry: 'desktop/main.ts',
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    // We are skipping preload to keep IPC complexity low
  },
  renderer: {
    root: 'desktop',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'desktop/index.html')
        }
      }
    }
  }
})
