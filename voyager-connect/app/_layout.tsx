import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AppProvider } from "@/src/AppContext";
import { PhotoCropperHost } from "@/src/components/PhotoCropperHost";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

const isWeb = Platform.OS === "web";

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  const content = (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <PhotoCropperHost />
    </AppProvider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {isWeb ? (
          <View style={{ flex: 1, alignItems: "center", backgroundColor: "#000" }}>
            <View style={{ flex: 1, width: "100%", maxWidth: 448, overflow: "hidden" }}>{content}</View>
          </View>
        ) : (
          content
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
