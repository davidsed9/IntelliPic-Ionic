import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'IntelliPicIonic',
  webDir: '.next/server/pages/',
  server: {
    androidScheme: 'https'
  }
};

export default config;
