import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: { __APP_VERSION__: '"0.0.0-test"' },
  test: { environment: 'node' },
})
