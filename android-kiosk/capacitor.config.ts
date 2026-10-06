import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymerp.kiosk',
  appName: 'GymERP Kiosk',
  webDir: 'www',
  server: {
    url: 'https://gymerp.com/kiosk/agent',
    cleartext: true
  }
};

export default config;
