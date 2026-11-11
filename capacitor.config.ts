import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.meme.library',
  appName: 'Meme',
  webDir: 'dist',
  backgroundColor: '#0b0c0f',
  android: {
    backgroundColor: '#0b0c0f',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
