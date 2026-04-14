// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // WSL/Docker 환경에서 코드 수정 반영을 위해 필요
    },
    host: true, // 0.0.0.0과 동일
    port: 5173,
  },
})