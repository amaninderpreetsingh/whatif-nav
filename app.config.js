const mapboxDownloadToken = process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN;

module.exports = {
  expo: {
    name: "WhatIf Nav",
    slug: "whatif-nav",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    scheme: "whatif-nav",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1a1a2e",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.whatifnav.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "WhatIf Nav needs your location to provide navigation.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "WhatIf Nav needs background location access to continue navigation when the app is minimized.",
        UIBackgroundModes: ["location"],
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.googleusercontent.apps.343792154194-3dbtsstn609be1tac7thkmg1p16rt430",
            ],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1a1a2e",
      },
      package: "com.whatifnav.app",
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
    },
    plugins: [
      "expo-router",
      "expo-location",
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: mapboxDownloadToken,
        },
      ],
      "expo-font",
      "expo-web-browser",
    ],
    extra: {
      router: {},
      eas: {
        projectId: "288ee821-53ad-423d-9c79-6d5744e5fe81",
      },
    },
  },
};
