import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lbt.social',
  appName: 'LBT Social',
  webDir: 'dist',

  server: {
    // للتطوير فقط — احذفه للإنتاج
    // url: 'http://192.168.1.x:5173',
    // cleartext: true,
  },

  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  ios: {
    backgroundColor: '#0a0a0a',
    contentInset: 'automatic',
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a0a',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
