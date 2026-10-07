import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymerp.manager',
  appName: 'GymERP Manager',
  webDir: 'www',
  server: {
    url: 'https://gymerp.com/dashboard',
    cleartext: true
  }
};

export default config;
