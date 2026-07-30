import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { useApp } from "@/src/AppContext";
import { bookingBus } from "@/src/bookingBus";
import { pickProfilePhoto } from "@/src/utils/pickProfilePhoto";
import { colors, spacing, radius, font } from "@/src/theme";
import { CinematicHero } from "@/src/components/CinematicHero";

const HERO_IMAGES = [
  "https://customer-assets-agu9un31.emergentagent.net/job_voyager-connect-4/artifacts/u0f4sdju_bimini-04.jpeg",
  "https://customer-assets-agu9un31.emergentagent.net/job_voyager-connect-4/artifacts/qs45rx0l_bimini-03.webp",
  "https://customer-assets-agu9un31.emergentagent.net/job_voyager-connect-4/artifacts/iv9hskml_bimini-05.jpeg",
  "https://customer-assets-agu9un31.emergentagent.net/job_voyager-connect-4/artifacts/w5izy82d_bimini-07.jpeg",
];

const VIBES = ["Party", "Chill", "Adventure", "Foodie", "Wellness"];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setProfile } = useApp();

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [homeTown, setHomeTown] = useState("");
  const [bio, setBio] = useState("");
  const [vibes, setVibes] = useState<string[]>([]);
  const toggleVibe = (v: string) =>
    setVibes((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : cur.length < 2 ? [...cur, v] : cur));
  const [isSingle, setIsSingle] = useState(false);
  const [photo, setPhoto] = useState("");

  const pickPhoto = async () => {
    const uri = await pickProfilePhoto();
    if (uri) setPhoto(uri);
  };

  const canSubmit = name.trim().length > 0 && !saving;

  const join = async (dest: "community" | "elite" | "book") => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const p = await api.createProfile({
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        home_town: homeTown.trim(),
        is_single: isSingle,
        bio: bio.trim(),
        vibe: vibes.join(", "),
        photo,
      });
      setProfile(p);
      if (dest === "elite") {
        router.replace({ pathname: "/(tabs)/icebreaker", params: { unlock: "1" } });
      } else {
        router.replace("/(tabs)/icebreaker");
        if (dest === "book") setTimeout(() => bookingBus.open(), 500);
      }
    } catch {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <CinematicHero images={HERO_IMAGES} />
          <LinearGradient
            colors={["rgba(28,32,31,0.15)", "rgba(28,32,31,0.55)", "rgba(28,32,31,0.9)"]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.heroKicker}>ICEBREAKER</Text>
          <Text style={styles.heroTitle}>Meet your crew before you set sail ⚓️</Text>
          <Text style={styles.heroSub}>
            See who else is aboard your Virgin Voyage. Break the ice early.
          </Text>
        </View>

        <View style={styles.body}>
          <Pressable testID="photo-picker" style={styles.photoPicker} onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={styles.photoEmpty}>
                <Ionicons name="camera" size={26} color={colors.brand} />
                <Text style={styles.photoText}>Add photo</Text>
              </View>
            )}
          </Pressable>

          <Field label="Your name *">
            <TextInput
              testID="name-input"
              value={name}
              onChangeText={setName}
              placeholder="First name"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Field label="Age">
                <TextInput
                  testID="age-input"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  placeholder="28"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </Field>
            </View>
            <View style={{ flex: 2 }}>
              <Field label="Home town">
                <TextInput
                  testID="hometown-input"
                  value={homeTown}
                  onChangeText={setHomeTown}
                  placeholder="City, State"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </Field>
            </View>
          </View>

          <Field label="Your vibe (pick up to 2)">
            <View style={styles.chipRow}>
              {VIBES.map((v) => {
                const on = vibes.includes(v);
                return (
                  <Pressable
                    key={v}
                    testID={`vibe-${v}`}
                    onPress={() => { Haptics.selectionAsync(); toggleVibe(v); }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{v}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="What brings you aboard?">
            <View style={styles.intentRow}>
              <Pressable
                testID="intent-friends"
                style={[styles.intentCard, !isSingle && styles.intentCardOn]}
                onPress={() => { Haptics.selectionAsync(); setIsSingle(false); }}
              >
                <Ionicons name="people" size={24} color={!isSingle ? colors.onBrand : colors.brand} />
                <Text style={[styles.intentTitle, !isSingle && styles.intentTextOn]}>Make friends</Text>
                <Text style={[styles.intentSub, !isSingle && styles.intentTextOn]}>Meet fellow cruisers</Text>
              </Pressable>
              <Pressable
                testID="intent-singles"
                style={[styles.intentCard, isSingle && styles.intentCardOn]}
                onPress={() => { Haptics.selectionAsync(); setIsSingle(true); }}
              >
                <Ionicons name="heart" size={24} color={isSingle ? colors.onBrand : colors.brand} />
                <Text style={[styles.intentTitle, isSingle && styles.intentTextOn]}>Meet singles</Text>
                <Text style={[styles.intentSub, isSingle && styles.intentTextOn]}>(and others too!)</Text>
              </Pressable>
            </View>
          </Field>

          <Field label="Short bio">
            <TextInput
              testID="bio-input"
              value={bio}
              onChangeText={setBio}
              placeholder="What are you most excited for?"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            />
          </Field>

          <Text style={styles.sectionLabel}>How do you want to join?</Text>
          {!canSubmit && <Text style={styles.joinHint}>Add your name above to continue.</Text>}

          <Pressable testID="join-book" style={[styles.joinBook, !canSubmit && styles.joinDisabled]} onPress={() => join("book")} disabled={!canSubmit}>
            <Ionicons name="boat" size={22} color={colors.onBrand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.joinBookTitle}>Book with me · Perks</Text>
              <Text style={styles.joinBookSub}>Book your Virgin Voyage through me — same price + extra perks, and Elite is FREE.</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.onBrand} />
          </Pressable>

          <Pressable testID="join-elite" style={[styles.joinElite, !canSubmit && styles.joinDisabled]} onPress={() => join("elite")} disabled={!canSubmit}>
            <Ionicons name="diamond" size={22} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.joinEliteTitle}>Get Icebreaker Elite</Text>
              <Text style={styles.joinEliteSub}>Booked with me? Enter your confirmation # — FREE. Booked elsewhere? A one-time $59.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>

          <Pressable testID="join-community" style={[styles.joinCommunity, !canSubmit && styles.joinDisabled]} onPress={() => join("community")} disabled={!canSubmit}>
            <Ionicons name="people" size={22} color={colors.onSurfaceTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.joinCommunityTitle}>General admission — Community</Text>
              <Text style={styles.joinCommunitySub}>Free. Mingle with everyone sailing soon.</Text>
            </View>
            {saving ? <ActivityIndicator color={colors.onSurfaceTertiary} /> : <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const styles = StyleSheet.create({
  hero: { padding: spacing.xl, paddingBottom: spacing["2xl"], minHeight: 320, justifyContent: "flex-end", overflow: "hidden" },
  heroKicker: { color: "rgba(255,255,255,0.85)", fontSize: font.sm, letterSpacing: 2 },
  heroTitle: { color: "#fff", fontSize: font["2xl"], fontWeight: "500", marginTop: spacing.sm },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: font.base, marginTop: spacing.sm, lineHeight: 20 },
  body: { paddingHorizontal: spacing.xl, marginTop: -spacing.lg },
  photoPicker: { alignSelf: "center", marginTop: spacing.lg },
  photo: { width: 96, height: 96, borderRadius: radius.pill, borderWidth: 3, borderColor: "#fff" },
  photoEmpty: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  photoText: { color: colors.brand, fontSize: font.sm, marginTop: 2 },
  fieldLabel: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginBottom: spacing.xs },
  sectionLabel: { fontSize: font.lg, fontWeight: "500", color: colors.onSurface, marginTop: spacing.xl },
  resolvedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#E6F4EA",
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.brandSecondary,
  },
  lockedField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  lockedText: { flex: 1, fontSize: font.base, color: colors.muted },
  confRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  verifyBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minWidth: 84,
    alignItems: "center",
  },
  verifyText: { color: colors.onBrand, fontSize: font.base, fontWeight: "500" },
  confErrText: { color: colors.error, fontSize: font.sm, marginTop: spacing.sm },
  confHint: { fontSize: font.sm, color: colors.muted, marginTop: spacing.md, lineHeight: 18 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.base,
    color: colors.onSurface,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 40,
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.onSurfaceTertiary, fontSize: font.base },
  chipTextOn: { color: colors.onBrand, fontWeight: "500" },
  singleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intentRow: { flexDirection: "row", gap: spacing.md },
  intentCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 4,
  },
  intentCardOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  intentTitle: { fontSize: font.base, fontWeight: "500", color: colors.onSurface, marginTop: spacing.xs },
  intentSub: { fontSize: font.sm, color: colors.muted },
  intentTextOn: { color: colors.onBrand },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    minHeight: 72,
  },
  dropdownSelected: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  dropdownPlaceholder: { fontSize: font.base, color: colors.muted, flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "82%",
  },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, marginBottom: spacing.md },
  modalTitle: { fontSize: font.xl, fontWeight: "500", color: colors.onSurface, marginBottom: spacing.sm },
  monthHeader: { fontSize: font.sm, fontWeight: "500", color: colors.brand, letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.xs, textTransform: "uppercase" },
  singleTitle: { fontSize: font.base, fontWeight: "500", color: colors.onSurface },
  singleSub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  switch: { width: 48, height: 28, borderRadius: radius.pill, backgroundColor: colors.border, padding: 3 },
  switchOn: { backgroundColor: colors.brand },
  knob: { width: 22, height: 22, borderRadius: radius.pill, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },
  cruiseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cruiseRowOn: { borderColor: colors.brand },
  cruiseThumb: { width: 56, height: 56, borderRadius: radius.sm },
  cruiseShip: { fontSize: font.base, fontWeight: "500", color: colors.onSurface },
  cruiseMeta: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submit: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  submitDisabled: { backgroundColor: colors.borderStrong },
  submitText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  joinHint: { color: colors.muted, fontSize: font.sm, marginTop: spacing.xs },
  joinDisabled: { opacity: 0.45 },
  joinBook: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.brand, padding: spacing.lg, borderRadius: radius.md, marginTop: spacing.md },
  joinBookTitle: { color: colors.onBrand, fontSize: font.lg, fontWeight: "600" },
  joinBookSub: { color: colors.onBrandTertiary, fontSize: font.sm, marginTop: 2, lineHeight: 18 },
  joinElite: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.brand, padding: spacing.lg, borderRadius: radius.md, marginTop: spacing.md },
  joinEliteTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "600" },
  joinEliteSub: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2, lineHeight: 18 },
  joinCommunity: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, borderRadius: radius.md, marginTop: spacing.md },
  joinCommunityTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: "500" },
  joinCommunitySub: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
});
