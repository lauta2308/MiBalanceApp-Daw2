import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unidad',
          include: ['src/**/*.test.{js,jsx}'],
          environment: 'jsdom',
          setupFiles: ['src/configuracionPruebas.js'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integracion',
          include: ['pruebas/**/*.test.js'],
          environment: 'node',
          env: loadEnv(mode, process.cwd(), 'VITE_'),
          fileParallelism: false,
        },
      },
    ],
  },
}))
