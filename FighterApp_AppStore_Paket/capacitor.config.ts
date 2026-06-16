import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.juniorlandu.fighter',
  appName: 'Fighter',
  webDir: 'build',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'always',
    backgroundColor: '#0d0d0d',
    preferredContentMode: 'mobile',
    scheme: 'Fighter',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0d0d0d',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0d0d0d',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
