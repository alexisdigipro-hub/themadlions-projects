import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative, so the build works on GitHub Pages under any repository name.
export default defineConfig({
  base: './',
  plugins: [react()],
  // chat.html: the chat on its own, added to a phone's home screen as TML Chat; roarme/index.html: RoarMe as its own app; roardino/index.html: Roardino on the hub's database; roarlist/index.html: RoarList (shot lists) on the hub's database
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500, rollupOptions: { input: { main: 'index.html', chat: 'chat.html', roarme: 'roarme/index.html', roardino: 'roardino/index.html', roarlist: 'roarlist/index.html' } } },
})
