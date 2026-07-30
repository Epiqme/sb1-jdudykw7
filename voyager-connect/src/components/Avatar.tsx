import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors, radius } from "@/src/theme";

const PALETTE = ["#FA4659", "#008A7A", "#D97B06", "#2E8540", "#BA1A2E"];

export function Avatar({
  name,
  photo,
  size = 48,
}: {
  name: string;
  photo?: string;
  size?: number;
}) {
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: radius.pill }}
        contentFit="cover"
        transition={200}
      />
    );
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const bg = PALETTE[(initial.charCodeAt(0) || 0) % PALETTE.length];
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius.pill, backgroundColor: bg },
      ]}
    >
      <Text style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "500" }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
});
