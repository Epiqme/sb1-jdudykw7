import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, Deal } from "@/src/api";
import { colors, spacing, radius, font, glass } from "@/src/theme";
import { GlassFill } from "@/src/components/GlassFill";

export default function Deals() {
  const insets = useSafeAreaInsets();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [quote, setQuote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setDeals(await api.deals());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runScan = async () => {
    const q = parseFloat(quote);
    if (!q || q <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    setResult(null);
    try {
      setResult(await api.dealScan({ quoted_price: q }));
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <GlassFill overlay={glass.overlayStrong} />
        <Text style={styles.title}>Deal Scanner</Text>
        <Text style={styles.subtitle}>Best Virgin Voyages fares + exclusive agency perks</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing["2xl"] }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
          <Pressable
            testID="open-deal-scan"
            style={styles.scanCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setResult(null);
              setQuote("");
              setScanOpen(true);
            }}
          >
            <LinearGradient colors={[colors.brandSecondary, "#00695f"]} style={StyleSheet.absoluteFill} />
            <View style={styles.scanIcon}>
              <Ionicons name="scan" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanTitle}>Free Deal Scan</Text>
              <Text style={styles.scanSub}>Got a quote? See how much you'd save booking through me.</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color="#fff" />
          </Pressable>

          {deals.map((d) => {
            const save = Math.round(d.base_price - d.deal_price);
            return (
              <View key={d.id} style={styles.card} testID={`deal-card-${d.id}`}>
                <GlassFill />
                <View style={styles.imgWrap}>
                  <Image source={{ uri: d.image }} style={styles.img} contentFit="cover" transition={250} />
                  <LinearGradient colors={["transparent", "rgba(28,32,31,0.8)"]} style={styles.scrim} />
                  {!!d.tag && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{d.tag}</Text>
                    </View>
                  )}
                  <View style={styles.imgText}>
                    <Text style={styles.dealTitle}>{d.title}</Text>
                    <Text style={styles.dealMeta}>{d.ship} · {d.nights} nights · {d.region}</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.fromLabel}>From</Text>
                      <View style={styles.priceLine}>
                        <Text style={styles.dealPrice}>${d.deal_price.toLocaleString()}</Text>
                        <Text style={styles.basePrice}>${d.base_price.toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveLabel}>You save</Text>
                      <Text style={styles.saveAmount}>${save.toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={styles.perkWrap}>
                    {d.perks.map((p) => (
                      <View key={p} style={styles.perkChip}>
                        <Ionicons name="gift" size={12} color={colors.onBrandTertiary} />
                        <Text style={styles.perkText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={scanOpen} transparent animationType="slide" onRequestClose={() => setScanOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setScanOpen(false)} />
          <View style={styles.sheet} testID="deal-scan-sheet">
            <GlassFill overlay={glass.overlayStrong} />
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Free Deal Scan</Text>
            <Text style={styles.sheetSub}>Enter the total price you were quoted (per person).</Text>
            <View style={styles.quoteRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                testID="quote-input"
                value={quote}
                onChangeText={setQuote}
                keyboardType="decimal-pad"
                placeholder="1500"
                placeholderTextColor={colors.muted}
                style={styles.quoteInput}
              />
            </View>
            <Pressable testID="run-scan" style={styles.scanBtn} onPress={runScan}>
              {scanning ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.scanBtnText}>Scan for savings</Text>}
            </Pressable>

            {result && (
              <View style={styles.resultCard} testID="scan-result">
                <Text style={styles.resultLabel}>Estimated total savings & value</Text>
                <Text style={styles.resultBig}>${result.total_savings.toLocaleString()}</Text>
                <View style={styles.resultRow}>
                  <Text style={styles.resultKey}>Better price</Text>
                  <Text style={styles.resultVal}>${result.agency_price.toLocaleString()}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultKey}>Bonus perk value</Text>
                  <Text style={styles.resultVal}>${result.perk_value.toLocaleString()}</Text>
                </View>
                <View style={styles.resultPerks}>
                  {result.perks.map((p: string) => (
                    <View key={p} style={styles.resPerk}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.brandSecondary} />
                      <Text style={styles.resPerkText}>{p}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.resultNote}>Estimate based on typical agency perks. Book through me to lock it in.</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: glass.hairline,
  },
  title: { fontSize: font["2xl"], fontWeight: "500", color: colors.onSurface },
  subtitle: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: 2 },
  scanCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  scanIcon: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  scanTitle: { color: "#fff", fontSize: font.lg, fontWeight: "500" },
  scanSub: { color: "rgba(255,255,255,0.9)", fontSize: font.sm, marginTop: 2 },
  card: {
    backgroundColor: "transparent",
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: glass.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  imgWrap: { height: 160 },
  img: { width: "100%", height: "100%" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "80%" },
  tag: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  tagText: { color: colors.onBrand, fontSize: font.sm, fontWeight: "500" },
  imgText: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.md },
  dealTitle: { color: "#fff", fontSize: font.xl, fontWeight: "500" },
  dealMeta: { color: "rgba(255,255,255,0.9)", fontSize: font.sm, marginTop: 2 },
  cardBody: { padding: spacing.lg },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fromLabel: { fontSize: font.sm, color: colors.muted },
  priceLine: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  dealPrice: { fontSize: font["2xl"], fontWeight: "500", color: colors.onSurface },
  basePrice: { fontSize: font.base, color: colors.muted, textDecorationLine: "line-through" },
  saveBadge: { backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: "center" },
  saveLabel: { fontSize: font.sm, color: colors.onBrandTertiary },
  saveAmount: { fontSize: font.xl, fontWeight: "500", color: colors.onBrandTertiary },
  perkWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  perkChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  perkText: { color: colors.onBrandTertiary, fontSize: font.sm, fontWeight: "500" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "transparent", overflow: "hidden", borderTopWidth: 1, borderColor: glass.border, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingBottom: spacing["2xl"] },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, marginBottom: spacing.lg },
  sheetTitle: { fontSize: font.xl, fontWeight: "500", color: colors.onSurface },
  sheetSub: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: spacing.xs },
  quoteRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  dollar: { fontSize: font["2xl"], color: colors.onSurface, fontWeight: "500" },
  quoteInput: { flex: 1, fontSize: font["2xl"], color: colors.onSurface, paddingVertical: spacing.md, marginLeft: spacing.xs },
  scanBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.lg },
  scanBtnText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  resultCard: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  resultLabel: { fontSize: font.sm, color: colors.onSurfaceTertiary },
  resultBig: { fontSize: font["3xl"], fontWeight: "500", color: colors.brandSecondary, marginTop: spacing.xs },
  resultRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  resultKey: { fontSize: font.base, color: colors.onSurfaceTertiary },
  resultVal: { fontSize: font.base, fontWeight: "500", color: colors.onSurface },
  resultPerks: { marginTop: spacing.md, gap: spacing.sm },
  resPerk: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  resPerkText: { fontSize: font.base, color: colors.onSurface },
  resultNote: { fontSize: font.sm, color: colors.muted, marginTop: spacing.md },
});
