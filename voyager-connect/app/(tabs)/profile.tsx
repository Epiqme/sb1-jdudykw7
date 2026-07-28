import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { useApp } from "@/src/AppContext";
import { Avatar } from "@/src/components/Avatar";
import { colors, spacing, radius, font, glass } from "@/src/theme";
import { GlassFill } from "@/src/components/GlassFill";
import { formatDate } from "@/app/onboarding";
import { shareInvite } from "@/src/invite";
import { pickProfilePhoto } from "@/src/utils/pickProfilePhoto";
import { pickCoverImage } from "@/src/utils/pickCoverImage";
import { ShareAppModal } from "@/src/components/ShareAppModal";

const VIBES = ["Party", "Chill", "Adventure", "Foodie", "Wellness"];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, cruise, unlocked, setProfile, signOut } = useApp();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [homeTown, setHomeTown] = useState("");
  const [bio, setBio] = useState("");
  const [vibes, setVibes] = useState<string[]>([]);
  const toggleVibe = (v: string) =>
    setVibes((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : cur.length < 2 ? [...cur, v] : cur));
  const [isSingle, setIsSingle] = useState(false);
  const [photo, setPhoto] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAge(profile.age ? String(profile.age) : "");
      setHomeTown(profile.home_town || "");
      setBio(profile.bio || "");
      setVibes(profile.vibe ? profile.vibe.split(",").map((s) => s.trim()).filter(Boolean) : []);
      setIsSingle(profile.is_single);
      setPhoto(profile.photo || "");
      setCoverImage(profile.cover_image || "");
    }
  }, [profile]);

  if (!profile) return null;

  const pickPhoto = async () => {
    const uri = await pickProfilePhoto();
    if (uri) setPhoto(uri);
  };

  const pickCover = async () => {
    const uri = await pickCoverImage();
    if (uri) {
      setCoverImage(uri);
      saveCover(uri);
    }
  };

  const saveCover = async (uri: string) => {
    const updated = await api.updateProfile(profile.id, {
      name: name.trim(),
      age: age ? parseInt(age, 10) : null,
      home_town: homeTown.trim(),
      cruise_id: profile.cruise_id,
      is_single: isSingle,
      bio: bio.trim(),
      vibe: vibes.join(", "),
      photo,
      cover_image: uri,
    });
    setProfile(updated);
  };

  const save = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updateProfile(profile.id, {
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        home_town: homeTown.trim(),
        cruise_id: profile.cruise_id,
        is_single: isSingle,
        bio: bio.trim(),
        vibe: vibes.join(", "),
        photo,
        cover_image: coverImage,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Image
            source={coverImage ? { uri: coverImage } : require("@/assets/images/profile-header.jpg")}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient colors={["transparent", "rgba(28,32,31,0.6)"]} style={StyleSheet.absoluteFill} />
          <Pressable testID="edit-cover" style={[styles.editCoverBtn, { top: insets.top + spacing.sm }]} onPress={pickCover} hitSlop={8}>
            <Ionicons name="camera" size={15} color="#fff" />
            <Text style={styles.editCoverText}>Edit cover</Text>
          </Pressable>
        </View>

        <View style={styles.avatarWrap}>
          <Pressable testID="profile-photo" onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatar}><Avatar name={name} size={96} /></View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>
        </View>

        <View style={styles.body}>
          {cruise && (
            <View style={styles.cruiseCard}>
              <GlassFill />
              <Ionicons name="boat" size={20} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cruiseShip}>{cruise.ship}</Text>
                <Text style={styles.cruiseMeta}>{formatDate(cruise.sail_date)} · {cruise.port}</Text>
              </View>
              <Pressable testID="profile-invite" onPress={() => shareInvite(cruise, name)} style={styles.inviteIconBtn}>
                <Ionicons name="share-social" size={18} color={colors.brand} />
              </Pressable>
              <Pressable testID="change-cruise" onPress={() => router.push("/(tabs)/sailings")}>
                <Text style={styles.changeText}>Change</Text>
              </Pressable>
            </View>
          )}

          <View style={[styles.statusCard, unlocked ? styles.statusUnlocked : styles.statusLocked]}>
            <Ionicons name={unlocked ? "lock-open" : "lock-closed"} size={18} color={unlocked ? colors.brandSecondary : colors.brand} />
            <Text style={[styles.statusText, { color: unlocked ? colors.brandSecondary : colors.brand }]}>
              {unlocked
                ? "Your cruise group is unlocked — you're in! 🎉"
                : "Cruise group locked — unlock for $59 in Icebreaker → My Cruise"}
            </Text>
          </View>

          <Field label="Name"><TextInput testID="edit-name" value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.muted} /></Field>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}><Field label="Age"><TextInput testID="edit-age" value={age} onChangeText={setAge} keyboardType="number-pad" style={styles.input} placeholderTextColor={colors.muted} /></Field></View>
            <View style={{ flex: 2 }}><Field label="Home town"><TextInput testID="edit-hometown" value={homeTown} onChangeText={setHomeTown} style={styles.input} placeholderTextColor={colors.muted} /></Field></View>
          </View>

          <Field label="Vibe (pick up to 2)">
            <View style={styles.chipRow}>
              {VIBES.map((v) => {
                const on = vibes.includes(v);
                return (
                  <Pressable key={v} onPress={() => toggleVibe(v)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{v}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Pressable testID="edit-singles" style={styles.singleRow} onPress={() => { Haptics.selectionAsync(); setIsSingle((s) => !s); }}>
            <Text style={styles.singleTitle}>Single & open to mingle 💘</Text>
            <View style={[styles.switch, isSingle && styles.switchOn]}><View style={[styles.knob, isSingle && styles.knobOn]} /></View>
          </Pressable>

          <Field label="Bio"><TextInput testID="edit-bio" value={bio} onChangeText={setBio} multiline style={[styles.input, { height: 80, textAlignVertical: "top" }]} placeholderTextColor={colors.muted} /></Field>

          <Pressable testID="save-profile" style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.saveText}>{saved ? "Saved ✓" : "Save profile"}</Text>}
          </Pressable>

          <Pressable testID="share-app" style={styles.adminRow} onPress={() => setShareOpen(true)}>
            <GlassFill />
            <Ionicons name="qr-code-outline" size={20} color={colors.brand} />
            <Text style={styles.adminText}>Share app (QR code)</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>

          <Pressable testID="admin-link" style={styles.adminRow} onPress={() => router.push("/admin")}>
            <GlassFill />
            <Ionicons name="settings-outline" size={20} color={colors.onSurfaceTertiary} />
            <Text style={styles.adminText}>Manage sailings & deals (Admin)</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>

          <Pressable testID="sign-out" style={styles.signOut} onPress={async () => { await signOut(); router.replace("/onboarding"); }}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          <View style={styles.legalRow}>
            <Pressable
              testID="privacy-policy"
              hitSlop={8}
              onPress={() => WebBrowser.openBrowserAsync("https://voyager-connect-app.netlify.app/privacy.html")}
            >
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable
              testID="contact-support"
              hitSlop={8}
              onPress={() => Linking.openURL("mailto:epiqrichman@gmail.com?subject=Icebreaker%20Support")}
            >
              <Text style={styles.legalLink}>Contact Support</Text>
            </Pressable>
          </View>

          <Pressable
            testID="delete-account"
            style={styles.deleteAccount}
            onPress={() => {
              const doDelete = async () => {
                try {
                  if (profile) await api.deleteProfile(profile.id);
                } catch {
                  /* ignore */
                }
                await signOut();
                router.replace("/onboarding");
              };
              const msg = "This permanently removes your profile, messages, and Elite access. This can't be undone.";
              if (Platform.OS === "web") {
                // Alert.alert is a no-op on react-native-web
                if (typeof window !== "undefined" && window.confirm(`Delete account?\n\n${msg}`)) doDelete();
              } else {
                Alert.alert("Delete account?", msg, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: doDelete },
                ]);
              }
            }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.brand} />
            <Text style={styles.deleteAccountText}>Delete account</Text>
          </Pressable>
        </View>
      </ScrollView>
      <ShareAppModal visible={shareOpen} onClose={() => setShareOpen(false)} cruise={cruise} name={name} />
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

const styles = StyleSheet.create({
  banner: { height: 140 },
  editCoverBtn: { position: "absolute", right: spacing.md, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill },
  editCoverText: { color: "#fff", fontSize: font.sm, fontWeight: "500" },
  avatarWrap: { alignItems: "center", marginTop: -48 },
  avatar: { width: 96, height: 96, borderRadius: radius.pill, borderWidth: 4, borderColor: colors.surface, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  editBadge: { position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface },
  body: { paddingHorizontal: spacing.xl, marginTop: spacing.md },
  cruiseCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "transparent", overflow: "hidden", padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: glass.border },
  cruiseShip: { fontSize: font.base, fontWeight: "500", color: colors.onSurface },
  cruiseMeta: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  changeText: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  inviteIconBtn: { padding: spacing.xs, marginRight: spacing.sm },
  statusCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  statusUnlocked: { backgroundColor: "#E6F4EA" },
  statusLocked: { backgroundColor: colors.brandTertiary },
  statusText: { flex: 1, fontSize: font.sm, fontWeight: "500", lineHeight: 18 },
  fieldLabel: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: font.base, color: colors.onSurface },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, height: 40, justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.onSurfaceTertiary, fontSize: font.base },
  chipTextOn: { color: colors.onBrand, fontWeight: "500" },
  singleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.md, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border },
  singleTitle: { fontSize: font.base, fontWeight: "500", color: colors.onSurface },
  switch: { width: 48, height: 28, borderRadius: radius.pill, backgroundColor: colors.border, padding: 3 },
  switchOn: { backgroundColor: colors.brand },
  knob: { width: 22, height: 22, borderRadius: radius.pill, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },
  saveBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.xl },
  saveText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  signOut: { alignItems: "center", paddingVertical: spacing.lg, marginTop: spacing.sm },
  signOutText: { color: colors.muted, fontSize: font.base },
  legalRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  legalLink: { color: colors.onSurfaceTertiary, fontSize: font.sm, fontWeight: "500", textDecorationLine: "underline" },
  legalDot: { color: colors.muted, fontSize: font.sm },
  deleteAccount: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: spacing.md },
  deleteAccountText: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  adminText: { flex: 1, color: colors.onSurface, fontSize: font.base, fontWeight: "500" },
});
