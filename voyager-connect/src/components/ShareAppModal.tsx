import React from "react";
import { View, Text, StyleSheet, Pressable, Modal, Share, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { Cruise, APP_URL } from "@/src/api";
import { shareInvite } from "@/src/invite";
import { GlassFill } from "@/src/components/GlassFill";
import { colors, spacing, radius, font, glass } from "@/src/theme";

export function ShareAppModal({
  visible,
  onClose,
  cruise,
  name,
}: {
  visible: boolean;
  onClose: () => void;
  cruise: Cruise | null;
  name?: string;
}) {
  const link = cruise ? `${APP_URL}/join/${cruise.id}` : `${APP_URL}/`;
  const shortLink = link.replace(/^https?:\/\//, "");

  const doShare = async () => {
    if (cruise) {
      await shareInvite(cruise, name);
    } else {
      try {
        await Share.share({
          message: `Join me on Icebreaker — see who else is aboard your Virgin Voyage and meet your crew before you sail! 🚢\n\n${link}`,
          url: link,
          title: "Join Icebreaker",
        });
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="share-app-modal">
          <GlassFill overlay={glass.overlayStrong} />
          <Pressable testID="share-app-close" style={styles.close} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.onSurfaceTertiary} />
          </Pressable>
          <Text style={styles.title}>{cruise ? "Invite your crew" : "Share Icebreaker"}</Text>
          <Text style={styles.sub}>
            {cruise
              ? "Scan to join your sailing's Icebreaker and see who's aboard."
              : "Scan to open Icebreaker and see who's on your cruise."}
          </Text>

          <View style={styles.qrWrap}>
            <QRCode value={link} size={220} color={colors.onSurface} backgroundColor="#fff" />
          </View>

          <Text style={styles.link} numberOfLines={2}>{shortLink}</Text>

          <Pressable testID="share-app-share" style={styles.shareBtn} onPress={doShare}>
            <Ionicons name="share-social" size={18} color={colors.onBrand} />
            <Text style={styles.shareText}>Share link</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 380, backgroundColor: "transparent", overflow: "hidden", borderWidth: 1, borderColor: glass.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center" },
  close: { position: "absolute", top: spacing.md, right: spacing.md, padding: spacing.xs, zIndex: 5 },
  title: { fontSize: font.xl, fontWeight: "600", color: colors.onSurface, marginTop: spacing.sm },
  sub: { fontSize: font.sm, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xs, lineHeight: 19, marginBottom: spacing.lg },
  qrWrap: { padding: spacing.lg, backgroundColor: "#fff", borderRadius: radius.md },
  link: { fontSize: font.sm, color: colors.brand, marginTop: spacing.lg, textAlign: "center" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    alignSelf: "stretch",
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  shareText: { color: colors.onBrand, fontSize: font.base, fontWeight: "500" },
});
