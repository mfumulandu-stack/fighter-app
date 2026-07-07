import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.fighterapp.app',
  appName: 'Fighter',
  webDir: 'build',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'never',
    backgroundColor: '#0d0d0d',
    preferredContentMode: 'mobile',
    scheme: 'Fighter',
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0d0d0d',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0d0d0d',
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
