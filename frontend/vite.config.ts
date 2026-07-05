declare module '@vitejs/plugin-react';

import react from '@vitejs/plugin-react';

export default {
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
};
