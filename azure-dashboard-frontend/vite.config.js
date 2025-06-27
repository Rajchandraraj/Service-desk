import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      protocol: 'wss', // Because ALB terminates SSL
      host: 'azurefrontend.skyclouds.live',
      clientPort: 443,
    }
  }
});

