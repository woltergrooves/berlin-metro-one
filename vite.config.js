import { defineConfig } from 'vite';

// The game boots through a long chain of `await import(...)` calls with top-level await.
// Merging modules into shared chunks can deadlock such chains (a dynamically imported module
// may end up in the same chunk as an ancestor that is still awaiting it). `preserveModules`
// keeps one output file per source module, so the browser evaluates exactly the same module
// graph as during development. Target es2022 = iOS Safari 15+ (top-level await).
export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    modulePreload: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
      },
    },
  },
});
