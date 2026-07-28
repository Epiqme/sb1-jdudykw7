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
import { api, DMMessage } from "@/src/api";
import { useApp } from "@/src/AppContext";
import { Avatar } from "@/src/components/Avatar";
import { pickChatImage } from "@/src/utils/pickChatImage";
import { GlassFill } from "@/src/components/GlassFill";
import { colors, spacing, radius, font, glass } from "@/src/theme";

export default function DirectMessage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { peerId, name } = useLocalSearchParams<{ peerId: string; name: string }>();
  const { profile } = useApp();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const lastMineId = [...messages].reverse().find((m) => m.from_id === profile?.id)?.id;

  const load = useCallback(async () => {
    if (!profile || !peerId) return;
    try {
      const msgs = await api.dmThread(profile.id, peerId);
      setMessages(msgs);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [profile?.id, peerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const t = text.trim();
    if (!t || !profile || !peerId) return;
    setSending(true);
    setText("");
    try {
      const msg = await api.dmSend({ from_id: profile.id, to_id: peerId, text: t });
      setMessages((m) => [...m, msg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } finally {
      setSending(false);
    }
  };

  const sendImage = async () => {
    if (!profile || !peerId) return;
    const image = await pickChatImage();
    if (!image) return;
    setSending(true);
    try {
      const msg = await api.dmSend({ from_id: profile.id, to_id: peerId, text: "", image });
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
        <Pressable testID="dm-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Avatar name={name || "?"} size={32} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{name || "Direct message"}</Text>
          <Text style={styles.headerSub}>Private chat</Text>
        </View>
      </View>

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
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && (
              <Text style={styles.emptyChat}>No messages yet. Say hi 👋</Text>
            )}
            {messages.map((m) => {
              const mine = m.from_id === profile?.id;
              const isLastMine = mine && m.id === lastMineId;
              return (
                <View key={m.id} style={[styles.wrap, mine && { alignSelf: "flex-end", alignItems: "flex-end" }]}>
                  <View style={[styles.row, mine && styles.rowMine]}>
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                      {!!m.image && <Image source={{ uri: m.image }} style={styles.msgImage} contentFit="cover" transition={150} />}
                      {!!m.text && <Text style={[styles.msgText, mine && { color: colors.onBrand }]}>{m.text}</Text>}
                    </View>
                  </View>
                  {isLastMine && (
                    <Text style={styles.status}>{m.read ? "Seen" : "Sent"}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <GlassFill overlay={glass.overlayStrong} />
          <Pressable testID="dm-attach" style={styles.attachBtn} onPress={sendImage} disabled={sending} hitSlop={8}>
            <Ionicons name="image-outline" size={24} color={colors.brand} />
          </Pressable>
          <TextInput
            testID="dm-input"
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <Pressable testID="dm-send" style={styles.sendBtn} onPress={send} disabled={sending}>
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
  emptyChat: { textAlign: "center", color: colors.muted, marginTop: spacing["2xl"], fontSize: font.base },
  wrap: { maxWidth: "82%", gap: 2 },
  status: { fontSize: font.sm, color: colors.muted, marginRight: spacing.xs },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, maxWidth: "82%" },
  rowMine: { alignSelf: "flex-end" },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  bubbleOther: { backgroundColor: colors.surfaceSecondary, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  msgText: { fontSize: font.base, color: colors.onSurface, lineHeight: 20 },
  msgImage: { width: 200, height: 200, borderRadius: radius.sm, marginBottom: 2 },
  attachBtn: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
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
  },
  sendBtn: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
});
