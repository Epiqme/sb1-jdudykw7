import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, Cruise } from "@/src/api";
import { useApp } from "@/src/AppContext";
import { colors, spacing, radius, font } from "@/src/theme";

export default function Join() {
  const router = useRouter();
  const { cruiseId } = useLocalSearchParams<{ cruiseId: string }>();
  const { ready, profile } = useApp();
  const [cruise, setCruise] = useState<Cruise | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .cruise(cruiseId)
      .then(setCruise)
      .catch(() => setError(true));
  }, [cruiseId]);

  useEffect(() => {
    if (!ready || !cruise) return;
    // Invites bring people into the app/Community. Access to a specific cruise
    // group (Elite) still requires a confirmation number or the $59 unlock.
    const dest = profile ? "/(tabs)/icebreaker" : "/onboarding";
    const t = setTimeout(() => router.replace(dest), 900);
    return () => clearTimeout(t);
  }, [ready, cruise, profile, router]);

  return (
    <View style={styles.container} testID="join-screen">
      <LinearGradient colors={[colors.brand, "#c9203a"]} style={StyleSheet.absoluteFill} />
      {error ? (
        <Text style={styles.title}>This invite link isn't valid anymore.</Text>
      ) : cruise ? (
        <>
          <Image source={{ uri: cruise.image }} style={styles.img} contentFit="cover" />
          <Text style={styles.kicker}>YOU'RE INVITED ⚓️</Text>
          <Text style={styles.title}>{cruise.ship}</Text>
          <Text style={styles.sub}>Joining the Icebreaker...</Text>
          <ActivityIndicator color="#fff" style={{ marginTop: spacing.lg }} />
        </>
      ) : (
        <ActivityIndicator color="#fff" size="large" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  img: { width: 200, height: 130, borderRadius: radius.lg, marginBottom: spacing.xl },
  kicker: { color: "rgba(255,255,255,0.9)", fontSize: font.sm, letterSpacing: 2 },
  title: { color: "#fff", fontSize: font["2xl"], fontWeight: "500", marginTop: spacing.sm, textAlign: "center" },
  sub: { color: "rgba(255,255,255,0.9)", fontSize: font.base, marginTop: spacing.xs },
});
