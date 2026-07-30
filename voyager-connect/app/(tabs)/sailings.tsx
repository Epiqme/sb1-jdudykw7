import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, Cruise } from "@/src/api";
import { useApp } from "@/src/AppContext";
import { colors, spacing, radius, font, glass } from "@/src/theme";
import { GlassFill } from "@/src/components/GlassFill";
import { formatDate } from "@/app/onboarding";

const REGIONS = ["All", "Caribbean", "Mediterranean", "Mexican Riviera"];

export default function Sailings() {
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const [cruises, setCruises] = useState<Cruise[]>([]);
  const [region, setRegion] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (r: string) => {
      try {
        setCruises(await api.cruises(r));
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      load(region);
    }, [load, region]),
  );


  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <GlassFill overlay={glass.overlayStrong} />
        <Text style={styles.title}>Upcoming Sailings</Text>
        <Text style={styles.subtitle}>Find your voyage & see who's aboard</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRowContent}
          style={styles.chipRow}
        >
          {REGIONS.map((r) => {
            const on = region === r;
            return (
              <Pressable
                key={r}
                testID={`region-chip-${r}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setRegion(r);
                }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{r}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing["2xl"] }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(region);
              }}
              tintColor={colors.brand}
            />
          }
        >
          {cruises.map((c) => {
            const mine = profile?.cruise_id === c.id;
            return (
              <View key={c.id} style={styles.card} testID={`sailing-card-${c.id}`}>
                <GlassFill />
                <View style={styles.imageWrap}>
                  <Image source={{ uri: c.image }} style={styles.image} contentFit="cover" transition={250} />
                  <LinearGradient
                    colors={["transparent", "rgba(28,32,31,0.85)"]}
                    style={styles.scrim}
                  />
                  <View style={styles.regionTag}>
                    <Text style={styles.regionTagText}>{c.region}</Text>
                  </View>
                  <View style={styles.imageText}>
                    <Text style={styles.ship}>{c.ship}</Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={14} color="#fff" />
                      <Text style={styles.metaText}>{formatDate(c.sail_date)}</Text>
                      <Ionicons name="moon-outline" size={14} color="#fff" style={{ marginLeft: spacing.sm }} />
                      <Text style={styles.metaText}>{c.nights} nights</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.portRow}>
                    <Ionicons name="location-outline" size={16} color={colors.brand} />
                    <Text style={styles.portText}>Departs {c.port}</Text>
                  </View>
                  <Text style={styles.itinerary} numberOfLines={2}>
                    {c.itinerary.join("  ›  ")}
                  </Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.countPill}>
                      <Ionicons name="people" size={14} color={colors.brandSecondary} />
                      <Text style={styles.countText}>{c.member_count} aboard</Text>
                    </View>
                    {mine ? (
                      <View style={styles.joinedBtn}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.brandSecondary} />
                        <Text style={styles.joinedText}>Your cruise</Text>
                      </View>
                    ) : (
                      <View style={styles.lockHint}>
                        <Ionicons name="lock-closed" size={13} color={colors.muted} />
                        <Text style={styles.lockHintText}>Confirm booking to join</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
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
  chipRow: { marginTop: spacing.md, height: 40 },
  chipRowContent: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  chipOn: { backgroundColor: colors.onSurface },
  chipText: { fontSize: font.base, color: colors.onSurfaceTertiary },
  chipTextOn: { color: colors.onSurfaceInverse, fontWeight: "500" },
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
  imageWrap: { height: 190 },
  image: { width: "100%", height: "100%" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" },
  regionTag: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  regionTagText: { color: colors.onBrand, fontSize: font.sm, fontWeight: "500" },
  imageText: { position: "absolute", left: spacing.lg, bottom: spacing.md, right: spacing.lg },
  ship: { color: "#fff", fontSize: font.xl, fontWeight: "500" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
  metaText: { color: "#fff", fontSize: font.sm, marginLeft: spacing.xs },
  cardBody: { padding: spacing.lg },
  portRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  portText: { fontSize: font.base, fontWeight: "500", color: colors.onSurface },
  itinerary: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: spacing.sm },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  countText: { fontSize: font.sm, color: colors.onSurfaceTertiary, fontWeight: "500" },
  joinBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  joinText: { color: colors.onBrand, fontSize: font.base, fontWeight: "500" },
  joinedBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  joinedText: { color: colors.brandSecondary, fontSize: font.base, fontWeight: "500" },
  lockHint: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  lockHintText: { color: colors.muted, fontSize: font.sm },
});
