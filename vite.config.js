import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative, so the build works on GitHub Pages under any repository name.
export default defineConfig({
  base: './',
  plugins: [react()],
  // roardino/index.html: Roardino on the hub's database; roarlist/index.html: RoarList (shot lists) on the hub's database;
  // previz/index.html: Camera Previz (three.js, static, no database)
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500, rollupOptions: { input: { main: 'index.html', roardino: 'roardino/index.html', roarlist: 'roarlist/index.html', previz: 'previz/index.html' } } },
})
