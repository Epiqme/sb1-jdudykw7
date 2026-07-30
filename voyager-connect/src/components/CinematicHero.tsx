import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  type SharedValue,
} from "react-native-reanimated";

// Cinematic "drone flyover" hero: cross-fades between aerial shots with a slow
// Ken Burns pan/zoom on each layer. Robust in Expo Go / web (no video needed).

function Layer({
  uri,
  index,
  active,
  direction,
}: {
  uri: string;
  index: number;
  active: SharedValue<number>;
  direction: number;
}) {
  const kb = useSharedValue(0);

  useEffect(() => {
    kb.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [kb]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: withTiming(active.value === index ? 1 : 0, { duration: 1600 }),
  }));

  const kbStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + kb.value * 0.16 },
      { translateX: direction * kb.value * 18 },
      { translateY: kb.value * -12 },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, kbStyle]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      </Animated.View>
    </Animated.View>
  );
}

export function CinematicHero({ images }: { images: string[] }) {
  const active = useSharedValue(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    const n = images.length;
    if (n <= 1) return;
    const t = setInterval(() => {
      active.value = (active.value + 1) % n;
      setTick((x) => x + 1);
    }, 5000);
    return () => clearInterval(t);
  }, [active, images.length]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {images.slice(0, 4).map((uri, i) => (
        <Layer key={uri} uri={uri} index={i} active={active} direction={i % 2 === 0 ? 1 : -1} />
      ))}
    </View>
  );
}
