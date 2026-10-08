import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative, so the build works on GitHub Pages under any repository name.
export default defineConfig({
  base: './',
  plugins: [react()],
  // chat.html: the chat on its own, added to a phone's home screen as TML Chat
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500, rollupOptions: { input: { main: 'index.html', chat: 'chat.html' } } },
})
