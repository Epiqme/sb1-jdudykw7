import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "@/src/AppContext";
import { colors } from "@/src/theme";

export default function Index() {
  const { ready, profile } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (profile) router.replace("/(tabs)/sailings");
    else router.replace("/onboarding");
  }, [ready, profile, router]);

  return (
    <View style={styles.container} testID="bootstrap-screen">
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
});
