// The panel on 5174 against a mock API on 8092, beside the real server's 8090: start a mock API there first. `turbo-admin-mock` in launch.json runs this.
import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

export default mergeConfig(base, defineConfig({
    server: {
        port: 5174,
        strictPort: true,
        proxy: { '/api': { target: 'http://127.0.0.1:8092', xfwd: true } },
    },
}), false);
