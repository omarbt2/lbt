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
    backgroundColor: '#F7F6F2',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  ios: {
    backgroundColor: '#F7F6F2',
    contentInset: 'automatic',
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1600,
      launchAutoHide: true,
      backgroundColor: '#F7F6F2',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#F7F6F2',
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
