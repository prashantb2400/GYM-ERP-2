import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymerp.manager',
  appName: 'GymERP Manager',
  webDir: 'www',
  server: {
    allowNavigation: ['*'],
    cleartext: true
  }
};

export default config;
