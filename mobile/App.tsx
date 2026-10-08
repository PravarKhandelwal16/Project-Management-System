import React, { Component } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { AuthProvider } from "./src/context/AuthContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { PushProvider } from "./src/context/PushContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { Page, Skeleton, ErrorBox } from "./src/components/UI";
class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { message: string }
> {
  state = { message: "" };
  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }
  render() {
    return this.state.message ? (
      <Page>
        <ErrorBox
          message={"Unable to start ProjectMaster. " + this.state.message}
        />
      </Page>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [loaded, error] = useFonts({
    Jakarta_400Regular: PlusJakartaSans_400Regular,
    Jakarta_500Medium: PlusJakartaSans_500Medium,
    Jakarta_700Bold: PlusJakartaSans_700Bold,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppErrorBoundary>
        {error ? (
          <Page>
            <ErrorBox message="Unable to load the app fonts. Restart the app and try again." />
          </Page>
        ) : !loaded ? (
          <Page>
            <Skeleton />
          </Page>
        ) : (
          <AuthProvider>
            <NotificationProvider>
              <PushProvider>
                <AppNavigator />
              </PushProvider>
            </NotificationProvider>
          </AuthProvider>
        )}
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
