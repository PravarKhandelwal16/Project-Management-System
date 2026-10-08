import type { ConfigContext, ExpoConfig } from "expo/config";
import { validateApiUrl } from "./src/services/apiCore";
export default ({ config }: ConfigContext): ExpoConfig => {
  const release =
    process.env.EAS_BUILD_PROFILE === "preview" ||
    process.env.EAS_BUILD_PROFILE === "production";
  if (release) validateApiUrl(process.env.EXPO_PUBLIC_API_URL || "", true);
  return {
    ...config,
    name: "ProjectMaster",
    slug: "projectmaster-mobile",
    scheme: "projectmaster",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    icon: "./assets/icon.png",
    ios: { supportsTablet: true, bundleIdentifier: "com.projectmaster.mobile" },
    android: {
      package: "com.projectmaster.mobile",
      ...(process.env.GOOGLE_SERVICES_JSON
        ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
        : {}),
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0B1120",
      },
    },
    plugins: [
      "expo-secure-store",
      [
        "expo-notifications",
        { defaultChannel: "task-reminders", color: "#3B82F6" },
      ],
      "expo-font",
      "@react-native-community/datetimepicker",
      [
        "expo-build-properties",
        { android: { usesCleartextTraffic: !release } },
      ],
    ],
  };
};
