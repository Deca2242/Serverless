import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Usamos VITE_API_ID separado para evitar que dotenv-expand interprete el
  // signo "$" de "$default" como variable de entorno y lo expanda a vacío.
  const apiId = env.VITE_API_ID || "MISSING";
  const apiTarget = `http://localhost:4566/restapis/${apiId}/$default/_user_request_`;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        // El navegador llama a /api/... → Vite lo reenvía al backend sin CORS
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
