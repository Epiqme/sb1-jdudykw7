import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Dimensions, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle } from "react-native-reanimated";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { cropBus, CropRequest } from "@/src/cropBus";
import { GlassFill } from "@/src/components/GlassFill";
import { colors, spacing, radius, font, glass } from "@/src/theme";

const AImage = Animated.createAnimatedComponent(Image);
const OUT_SIZE = 600; // final square output in px

export function PhotoCropperHost() {
  const [req, setReq] = useState<CropRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useRef(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useRef(0);
  const savedTy = useRef(0);
  // JS mirrors so we can read the latest values when confirming.
  const jsScale = useRef(1);
  const jsTx = useRef(0);
  const jsTy = useRef(0);

  useEffect(() => cropBus.subscribe((r) => {
    reset();
    setReq(r);
  }), []);

  const winW = Dimensions.get("window").width;
  const S = Math.min(winW - 48, 320);
  const baseScale = req ? S / Math.min(req.width, req.height) : 1;

  const reset = () => {
    scale.value = 1; savedScale.current = 1; jsScale.current = 1;
    tx.value = 0; ty.value = 0; savedTx.current = 0; savedTy.current = 0; jsTx.current = 0; jsTy.current = 0;
  };

  const setScale = (v: number) => {
    const clamped = Math.max(1, Math.min(v, 5));
    scale.value = clamped; savedScale.current = clamped; jsScale.current = clamped;
  };

  const pan = Gesture.Pan()
    .onChange((e) => {
      tx.value = savedTx.current + e.translationX;
      ty.value = savedTy.current + e.translationY;
    })
    .onEnd(() => {
      savedTx.current = tx.value; savedTy.current = ty.value;
      jsTx.current = tx.value; jsTy.current = ty.value;
    });

  const pinch = Gesture.Pinch()
    .onChange((e) => {
      const s = Math.max(1, Math.min(savedScale.current * e.scale, 5));
      scale.value = s;
    })
    .onEnd(() => {
      savedScale.current = scale.value; jsScale.current = scale.value;
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const finish = (result: string | null) => {
    req?.resolve(result);
    setReq(null);
  };

  const confirm = async () => {
    if (!req) return;
    setBusy(true);
    try {
      const s = jsScale.current;
      const dispW = req.width * baseScale * s;
      const dispH = req.height * baseScale * s;
      const originXScreen = (S - dispW) / 2 + jsTx.current;
      const originYScreen = (S - dispH) / 2 + jsTy.current;
      const effScale = baseScale * s; // screen px per source px
      let srcSize = S / effScale;
      let srcLeft = (0 - originXScreen) / effScale;
      let srcTop = (0 - originYScreen) / effScale;
      // Clamp within image bounds.
      srcSize = Math.min(srcSize, req.width, req.height);
      srcLeft = Math.max(0, Math.min(srcLeft, req.width - srcSize));
      srcTop = Math.max(0, Math.min(srcTop, req.height - srcSize));
      const out = await manipulateAsync(
        req.uri,
        [
          { crop: { originX: Math.round(srcLeft), originY: Math.round(srcTop), width: Math.round(srcSize), height: Math.round(srcSize) } },
          { resize: { width: OUT_SIZE, height: OUT_SIZE } },
        ],
        { format: SaveFormat.JPEG, compress: 0.7, base64: true },
      );
      finish(out.base64 ? `data:image/jpeg;base64,${out.base64}` : null);
    } catch (e) {
      console.warn("[cropper] manipulate failed:", String(e));
      finish(null);
    } finally {
      setBusy(false);
    }
  };

  const dispW = req ? req.width * baseScale : 0;
  const dispH = req ? req.height * baseScale : 0;

  return (
    <Modal visible={!!req} transparent animationType="fade" onRequestClose={() => finish(null)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <GlassFill overlay={glass.overlayStrong} />
          <Text style={styles.title}>Adjust your photo</Text>
          <Text style={styles.sub}>Drag to move · pinch or use +/− to zoom</Text>

          <View style={[styles.viewport, { width: S, height: S }]}>
            {req && (
              <GestureDetector gesture={gesture}>
                <Animated.View style={styles.center}>
                  <AImage
                    source={{ uri: req.uri }}
                    style={[{ width: dispW, height: dispH }, imgStyle]}
                    resizeMode="cover"
                  />
                </Animated.View>
              </GestureDetector>
            )}
            {/* circular mask outline */}
            <View pointerEvents="none" style={[styles.maskRing, { width: S, height: S, borderRadius: S / 2 }]} />
          </View>

          <View style={styles.zoomRow}>
            <Pressable testID="crop-zoom-out" style={styles.zoomBtn} onPress={() => setScale(jsScale.current - 0.3)}>
              <Ionicons name="remove" size={22} color={colors.onSurface} />
            </Pressable>
            <Pressable testID="crop-zoom-in" style={styles.zoomBtn} onPress={() => setScale(jsScale.current + 0.3)}>
              <Ionicons name="add" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable testID="crop-cancel" style={[styles.btn, styles.btnGhost]} onPress={() => finish(null)} disabled={busy}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable testID="crop-confirm" style={[styles.btn, styles.btnPrimary]} onPress={confirm} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.btnPrimaryText}>Use photo</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 400, backgroundColor: "transparent", overflow: "hidden", borderWidth: 1, borderColor: glass.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center" },
  title: { fontSize: font.xl, fontWeight: "600", color: colors.onSurface },
  sub: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2, marginBottom: spacing.lg, textAlign: "center" },
  viewport: { overflow: "hidden", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", width: "100%", height: "100%" },
  maskRing: { position: "absolute", borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" },
  zoomRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg },
  zoomBtn: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl, alignSelf: "stretch" },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
  btnGhost: { backgroundColor: colors.surfaceTertiary },
  btnGhostText: { color: colors.onSurface, fontSize: font.base, fontWeight: "500" },
  btnPrimary: { backgroundColor: colors.brand },
  btnPrimaryText: { color: colors.onBrand, fontSize: font.base, fontWeight: "500" },
});
