import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

function syncRootIndexPlugin() {
  return {
    name: 'sync-root-and-dist-index',
    writeBundle(options) {
      const outDir = options.dir || path.resolve('dist');
      const studioOut = path.join(outDir, 'studio.html');
      if (!fs.existsSync(studioOut)) return;
      const html = fs.readFileSync(studioOut, 'utf8');
      fs.writeFileSync(path.join(outDir, 'index.html'), html);
      fs.unlinkSync(studioOut);
      // Generate root index.html for static hosting (e.g. GitHub Pages subpath deployment)
      const rootHtml = html.replace(/(href|src)="\.\/assets\//g, '$1="./dist/assets/');
      fs.writeFileSync(path.resolve('index.html'), rootHtml);
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), syncRootIndexPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    open: '/studio.html'
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'studio.html'
    }
  }
});
