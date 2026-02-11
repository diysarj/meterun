import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    "vendor-react": ["react", "react-dom", "react-router-dom"],
                    "vendor-charts": ["recharts"],
                    "vendor-map": ["leaflet", "react-leaflet"],
                    "vendor-motion": ["framer-motion"],
                },
            },
        },
    },
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:5000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
