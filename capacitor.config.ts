import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fourplaypicks.app',
  appName: 'FourPlay Picks',
  webDir: 'out',
  server: {
    url: 'https://www.fourplaypicks.com',
    cleartext: false
  }
};

export default config;
