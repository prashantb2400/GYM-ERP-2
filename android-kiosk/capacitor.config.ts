import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymerp.kiosk',
  appName: 'GymERP Kiosk',
  webDir: 'www',
  server: {
    allowNavigation: ['*', 'http://*', 'https://*'],
    cleartext: true
  }
};

export default config;
