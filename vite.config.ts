import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [ react(), tailwindcss() ],
    resolve: {
        alias: { '#': `${import.meta.dirname}/src` },
    },
    server: {
        // The port the server's Turbo:Admin:PanelUrl expects by default.
        port: 5173,
        strictPort: true,
        // The API on the panel's own origin, as the deployed site serves it: no cross-origin
        // requests, and passkeys bound to the address the panel is opened at.
        proxy: { '/api': { target: 'http://127.0.0.1:8090', xfwd: true } },
    },
});
