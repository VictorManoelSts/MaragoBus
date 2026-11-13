import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['packages/shared/tests/**/*.spec.ts', 'apps/portal/tests/**/*.spec.ts', 'apps/admin/tests/**/*.spec.ts'],
    setupFiles: ['./packages/shared/tests/setup.ts'],
    clearMocks: true,
  },
})
