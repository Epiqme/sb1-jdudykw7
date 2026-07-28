import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, font, glass } from "@/src/theme";
import { GlassFill } from "@/src/components/GlassFill";
import { api } from "@/src/api";
import { useApp } from "@/src/AppContext";
import { bookingBus } from "@/src/bookingBus";

const TAB_H = 64;

export function BookCTA() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, refresh } = useApp();
  const [open, setOpen] = useState(false);
  const [returnStep, setReturnStep] = useState<null | "ask" | "conf">(null);
  const [confInput, setConfInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [links, setLinks] = useState<{
    fora_url: string;
    firstmates_url: string;
    agent_name: string;
    tagline: string;
  } | null>(null);

  useEffect(() => {
    api.bookingLinks().then(setLinks).catch(() => {});
  }, []);

  // Allow other screens (e.g. the Icebreaker crossroads) to open this sheet.
  useEffect(() => bookingBus.subscribe(() => setOpen(true)), []);

  const bottom = insets.bottom + TAB_H + spacing.md;
  const [opening, setOpening] = useState(false);

  const openBook = async () => {
    if (!links || opening) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(links.fora_url);
    } finally {
      setOpening(false);
      setOpen(false);
      // Virgin can't redirect back into our app — ask on return.
      setConfInput("");
      setErr("");
      setReturnStep("ask");
    }
  };

  const confirmBooking = async () => {
    if (!profile || confInput.trim().length < 5) return;
    setBusy(true);
    setErr("");
    try {
      const res = await api.resolveConfirmation(confInput.trim());
      if (res.valid && res.cruise) {
        await api.eliteConfirm({ profile_id: profile.id, confirmation_number: confInput.trim() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refresh();
        setReturnStep(null);
        router.push({ pathname: "/(tabs)/icebreaker", params: { goto: "cruise" } });
      } else {
        setErr("We couldn't find a sailing for that confirmation number yet. Double-check and try again.");
      }
    } catch {
      setErr("Couldn't verify right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
        <Pressable
          testID="book-cta-pill"
          style={styles.pill}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setOpen(true);
          }}
        >
          <GlassFill overlay={glass.overlayBrand} />
          <Ionicons name="boat" size={16} color={colors.onBrand} />
          <Text style={styles.pillText}>Book with me · Perks</Text>
        </Pressable>
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet} testID="book-sheet">
          <GlassFill overlay={glass.overlayStrong} />
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle}>{links?.agent_name || "Book with me"}</Text>
            <Text style={styles.sheetSub}>{links?.tagline}</Text>

            <View style={styles.highlight}>
              <Ionicons name="diamond" size={18} color={colors.brandSecondary} />
              <Text style={styles.highlightText}>
                After you book, enter your confirmation # in <Text style={{ fontWeight: "500" }}>Icebreaker Elite</Text> to unlock it FREE — plus exclusive perks & the best price.
              </Text>
            </View>

            <View style={styles.samePrice}>
              <Ionicons name="pricetag" size={18} color={colors.brand} />
              <Text style={styles.samePriceText}>
                <Text style={{ fontWeight: "500" }}>Same price as booking direct.</Text> You pay exactly what Virgin charges — I just add the extra perks on top, at no cost to you.
              </Text>
            </View>

            <Pressable testID="book-virgin-button" style={styles.primaryBtn} onPress={openBook}>
              <Ionicons name="boat" size={20} color={colors.onBrand} />
              <Text style={styles.primaryBtnText}>Book with me</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.onBrand} />
            </Pressable>

            <Text style={styles.crossroads}>— or —</Text>

            <Pressable
              testID="join-elite-button"
              style={styles.secondaryBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setOpen(false);
                router.push({ pathname: "/(tabs)/icebreaker", params: { unlock: "1" } });
              }}
            >
              <Ionicons name="diamond" size={18} color={colors.onBrandTertiary} />
              <Text style={styles.secondaryBtnText}>Join Icebreaker Elite</Text>
            </Pressable>
            <Text style={styles.eliteHint}>
              Booked with me? Enter your confirmation # to join FREE. Booked elsewhere? A one-time $59.
            </Text>

            <Pressable
              testID="deal-scan-shortcut"
              style={styles.ghostBtn}
              onPress={() => {
                setOpen(false);
                router.push("/(tabs)/deals");
              }}
            >
              <Ionicons name="pricetags" size={18} color={colors.brand} />
              <Text style={styles.ghostBtnText}>Run a free deal scan</Text>
            </Pressable>

            <Text style={styles.disclaimer}>
              Opens Virgin Voyages' official booking with your advisor & Firstmates ID applied.
            </Text>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={returnStep !== null} animationType="fade" transparent onRequestClose={() => setReturnStep(null)}>
        <View style={styles.centerBackdrop}>
          <View style={styles.returnCard} testID="booking-return-modal">
            <GlassFill overlay={glass.overlayStrong} />
            {returnStep === "ask" ? (
              <>
                <Ionicons name="boat" size={30} color={colors.brand} />
                <Text style={styles.returnTitle}>Did you complete your booking?</Text>
                <Text style={styles.returnSub}>If you booked with me, enter your confirmation # to unlock Icebreaker Elite FREE.</Text>
                <Pressable testID="booking-yes" style={styles.returnPrimary} onPress={() => { setErr(""); setReturnStep("conf"); }}>
                  <Text style={styles.returnPrimaryText}>Yes, I booked</Text>
                </Pressable>
                <Pressable testID="booking-notyet" style={styles.returnGhost} onPress={() => setReturnStep(null)}>
                  <Text style={styles.returnGhostText}>Not yet</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Ionicons name="diamond" size={30} color={colors.brand} />
                <Text style={styles.returnTitle}>Enter your confirmation #</Text>
                <Text style={styles.returnSub}>We'll match you to your sailing and unlock Elite.</Text>
                <TextInput
                  testID="booking-conf-input"
                  value={confInput}
                  onChangeText={setConfInput}
                  placeholder="Confirmation number"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  style={styles.returnInput}
                />
                {!!err && <Text style={styles.returnErr}>{err}</Text>}
                <Pressable
                  testID="booking-conf-submit"
                  style={[styles.returnPrimary, confInput.trim().length < 5 && { opacity: 0.5 }]}
                  onPress={confirmBooking}
                  disabled={busy || confInput.trim().length < 5}
                >
                  {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.returnPrimaryText}>Unlock Elite</Text>}
                </Pressable>
                <Pressable testID="booking-conf-cancel" style={styles.returnGhost} onPress={() => setReturnStep(null)}>
                  <Text style={styles.returnGhostText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  centerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: spacing.xl },
  returnCard: { backgroundColor: "transparent", overflow: "hidden", borderWidth: 1, borderColor: glass.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center" },
  returnTitle: { color: colors.onSurface, fontSize: font.xl, fontWeight: "600", marginTop: spacing.sm, textAlign: "center" },
  returnSub: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: "center", marginTop: spacing.xs, lineHeight: 20 },
  returnInput: { alignSelf: "stretch", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: font.lg, color: colors.onSurface, letterSpacing: 1, textAlign: "center", marginTop: spacing.lg },
  returnErr: { color: colors.brand, fontSize: font.sm, marginTop: spacing.sm, textAlign: "center" },
  returnPrimary: { alignSelf: "stretch", backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.lg },
  returnPrimaryText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  returnGhost: { alignSelf: "stretch", paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.xs },
  returnGhostText: { color: colors.muted, fontSize: font.base },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  pillText: { color: colors.onBrand, fontSize: font.sm, fontWeight: "500" },
  freeBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  freeBadgeText: { color: colors.onBrand, fontSize: font.sm },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "transparent",
    overflow: "hidden",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: glass.border,
    padding: spacing.xl,
    paddingBottom: spacing["2xl"],
    maxHeight: "80%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: font.xl, fontWeight: "500", color: colors.onSurface },
  sheetSub: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: spacing.xs },
  highlight: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  highlightText: { flex: 1, color: colors.onBrandTertiary, fontSize: font.base, lineHeight: 20 },
  samePrice: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  samePriceText: { flex: 1, color: colors.onSurfaceTertiary, fontSize: font.base, lineHeight: 20 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  primaryBtnText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  secondaryBtnText: { color: colors.onBrandTertiary, fontSize: font.base, fontWeight: "500" },
  crossroads: { textAlign: "center", color: colors.muted, fontSize: font.sm, marginTop: spacing.md },
  eliteHint: { textAlign: "center", color: colors.muted, fontSize: font.sm, marginTop: spacing.sm, lineHeight: 18 },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  ghostBtnText: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  disclaimer: {
    fontSize: font.sm,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
