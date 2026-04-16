/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import * as path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/libs/web/feature-admin',
  plugins: [angular(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  resolve: {
    alias: {
      '@ds/web/data-access': path.resolve(__dirname, '../../../libs/web/data-access/src/index.ts'),
    },
  },
  test: {
    name: 'feature-admin',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/web/feature-admin',
      provider: 'v8' as const,
    },
  },
}));
