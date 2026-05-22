const variant = process.env.APP_VARIANT ?? 'production';

const variants = {
  development: { name: 'Audio Player (Dev)', suffix: '.dev' },
  preview: { name: 'Audio Player (Preview)', suffix: '.preview' },
  production: { name: 'Audio Player', suffix: '' },
};

const { name, suffix } = variants[variant] ?? variants.production;

module.exports = {
  expo: {
    name,
    slug: 'video-player-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#17212b',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: `com.videoplayer.mobile${suffix}`,
      infoPlist: {
        UIBackgroundModes: ['audio'],
      },
    },
    android: {
      package: `com.videoplayer.mobile${suffix}`,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#17212b',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
    ],
    extra: {
      apiUrl: 'http://10.0.2.2:3001/api',
      eas: {
        projectId: 'c12114f1-db97-458e-824a-d2c6595524d7',
      },
    },
    owner: 'larek',
  },
};
