import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { glass } from "@/src/theme";

/**
 * Liquid Glass fill: a blurred layer + a translucent under-tint, both absolutely
 * filling the parent. Drop it in as the FIRST child of any surface (card, sheet,
 * header, tab bar) and set that surface's backgroundColor to "transparent" and
 * overflow to "hidden". The under-tint keeps text WCAG-contrast safe over any
 * scrolling/photo background behind the blur. Layout is unaffected.
 */
export function GlassFill({
  intensity = glass.blurIntensity,
  tint = glass.tint,
  overlay = glass.overlay,
}: {
  intensity?: number;
  tint?: "light" | "dark" | "default";
  overlay?: string;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFill}
        {...(Platform.OS === "android" ? { experimentalBlurMethod: "dimezisBlurView" as const } : {})}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />
    </View>
  );
}
