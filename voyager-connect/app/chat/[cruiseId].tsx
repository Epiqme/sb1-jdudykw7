import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, Message } from "@/src/api";
import { useApp } from "@/src/AppContext";
import { Avatar } from "@/src/components/Avatar";
import { pickChatImage } from "@/src/utils/pickChatImage";
import { GlassFill } from "@/src/components/GlassFill";
import { colors, spacing, radius, font, glass } from "@/src/theme";

export default function Chat() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cruiseId, title } = useLocalSearchParams<{ cruiseId: string; title: string }>();
  const { profile, unlocked } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const msgs = await api.messages(cruiseId, profile?.id);
      setMessages(msgs);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [cruiseId, profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const t = text.trim();
    if (!t || !profile) return;
    setSending(true);
    setText("");
    try {
      const msg = await api.sendMessage(cruiseId, { profile_id: profile.id, name: profile.name, text: t });
      setMessages((m) => [...m, msg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } finally {
      setSending(false);
    }
  };

  const sendImage = async () => {
    if (!profile) return;
    const image = await pickChatImage();
    if (!image) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(cruiseId, { profile_id: profile.id, name: profile.name, text: "", image });
      setMessages((m) => [...m, msg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <GlassFill overlay={glass.overlayStrong} />
        <Pressable testID="chat-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || "Group Chat"}</Text>
          <Text style={styles.headerSub}>Break the ice 👋</Text>
        </View>
      </View>

      {cruiseId === "general" && !unlocked && (
        <Pressable
          testID="chat-get-elite"
          style={styles.eliteBanner}
          onPress={() => router.push({ pathname: "/(tabs)/icebreaker", params: { unlock: "1" } })}
        >
          <Ionicons name="diamond" size={18} color={colors.onBrand} />
          <Text style={styles.eliteBannerText}>Get Icebreaker Elite — see who's on your ship</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.onBrand} />
        </Pressable>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 44}
      >
        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: spacing["2xl"] }} />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, width: "100%" }}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && (
              <Text style={styles.emptyChat}>No messages yet. Say hi and get the party started! 🎉</Text>
            )}
            {messages.map((m) => {
              const mine = m.profile_id === profile?.id;
              return (
                <View key={m.id} style={[styles.row, mine && styles.rowMine]}>
                  {!mine && <Avatar name={m.name} size={32} />}
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    {!mine && <Text style={styles.msgName}>{m.name}</Text>}
                    {!!m.image && <Image source={{ uri: m.image }} style={styles.msgImage} contentFit="cover" transition={150} />}
                    {!!m.text && <Text style={[styles.msgText, mine && { color: colors.onBrand }]}>{m.text}</Text>}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <GlassFill overlay={glass.overlayStrong} />
          <Pressable testID="chat-attach" style={styles.attachBtn} onPress={sendImage} disabled={sending} hitSlop={8}>
            <Ionicons name="image-outline" size={24} color={colors.brand} />
          </Pressable>
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <Pressable testID="chat-send" style={styles.sendBtn} onPress={send} disabled={sending}>
            <Ionicons name="send" size={18} color={colors.onBrand} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: glass.hairline,
  },
  headerTitle: { fontSize: font.lg, fontWeight: "500", color: colors.onSurface },
  headerSub: { fontSize: font.sm, color: colors.muted },
  eliteBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.brand, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  eliteBannerText: { flex: 1, color: colors.onBrand, fontSize: font.base, fontWeight: "600" },
  emptyChat: { textAlign: "center", color: colors.muted, marginTop: spacing["2xl"], fontSize: font.base },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, width: "100%" },
  rowMine: { justifyContent: "flex-end", flexDirection: "row-reverse" },
  bubble: { maxWidth: "82%", flexShrink: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  bubbleOther: { backgroundColor: colors.surfaceSecondary, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  msgName: { fontSize: font.sm, color: colors.brand, fontWeight: "500", marginBottom: 2 },
  msgText: { fontSize: font.base, color: colors.onSurface, lineHeight: 20 },
  msgImage: { width: 200, height: 200, borderRadius: radius.sm, marginBottom: 2 },
  attachBtn: { width: 40, height: 44, alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: glass.hairline,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: font.base,
    color: colors.onSurface,
    maxHeight: 100,
    position: "relative",
    zIndex: 1,
  },
  sendBtn: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 },
});
