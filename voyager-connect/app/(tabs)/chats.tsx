import React, { useCallback, useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, DMConversation } from "@/src/api";
import { useApp } from "@/src/AppContext";
import { Avatar } from "@/src/components/Avatar";
import { GlassFill } from "@/src/components/GlassFill";
import { colors, spacing, radius, font, glass } from "@/src/theme";

export default function Chats() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useApp();
  const [convos, setConvos] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setConvos(await api.dmConversations(profile.id));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const openThread = (c: DMConversation) =>
    router.push({ pathname: "/dm/[peerId]", params: { peerId: c.partner_id, name: c.partner_name } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <GlassFill overlay={glass.overlayStrong} />
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.subtitle}>Your private conversations</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing["2xl"] }} />
      ) : convos.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySub}>Tap “Message” on someone in Icebreaker to start a private chat.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />
          }
        >
          {convos.map((c) => (
            <Pressable key={c.partner_id} testID={`convo-${c.partner_id}`} style={styles.row} onPress={() => openThread(c)}>
              <GlassFill />
              {c.partner_photo ? (
                <Image source={{ uri: c.partner_photo }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatar}><Avatar name={c.partner_name} size={48} /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{c.partner_name}</Text>
                <Text style={[styles.preview, c.unread > 0 && styles.previewUnread]} numberOfLines={1}>{c.last_text}</Text>
              </View>
              {c.unread > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{c.unread}</Text></View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
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
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  emptyWrap: { alignItems: "center", padding: spacing.xl, paddingTop: spacing["3xl"], gap: spacing.sm },
  emptyTitle: { fontSize: font.lg, fontWeight: "500", color: colors.onSurface, marginTop: spacing.md },
  emptySub: { fontSize: font.base, color: colors.onSurfaceTertiary, textAlign: "center", lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: glass.border,
  },
  avatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  name: { fontSize: font.base, fontWeight: "500", color: colors.onSurface },
  preview: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  previewUnread: { color: colors.onSurface, fontWeight: "500" },
  badge: { minWidth: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: colors.onBrand, fontSize: font.sm, fontWeight: "600" },
});
