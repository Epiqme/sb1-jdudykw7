import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  AppState,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { bookingBus } from "@/src/bookingBus";
import EliteApplePayButton from "@/src/components/EliteApplePayButton";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { api, Profile } from "@/src/api";
import { BACKEND_URL } from "@/src/api";
import { useApp } from "@/src/AppContext";
import { colors, spacing, radius, font, glass } from "@/src/theme";
import { GlassFill } from "@/src/components/GlassFill";
import { Avatar } from "@/src/components/Avatar";
import { formatDate } from "@/app/onboarding";
import { shareInvite } from "@/src/invite";

type Segment = "community" | "cruise";

export default function Icebreaker() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ unlock?: string; goto?: string }>();
  const { profile, cruise, unlocked, unlock, refresh } = useApp();

  const [segment, setSegment] = useState<Segment>("community");
  const [singlesOnly, setSinglesOnly] = useState(false);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waved, setWaved] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [pendingSession, setPendingSession] = useState<string | null>(null);
  const [confOpen, setConfOpen] = useState(false);
  const [confStep, setConfStep] = useState<"enter" | "pay">("enter");
  const [confInput, setConfInput] = useState("");
  const [confErr, setConfErr] = useState("");
  const [confSaving, setConfSaving] = useState(false);
  const [payCruises, setPayCruises] = useState<any[]>([]);
  const [payCruiseId, setPayCruiseId] = useState("");
  const [locateInput, setLocateInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateErr, setLocateErr] = useState("");

  const findMyCruise = async () => {
    if (!profile || locateInput.trim().length < 5) return;
    setLocating(true);
    setLocateErr("");
    try {
      const res = await api.resolveConfirmation(locateInput.trim());
      if (res.valid && res.cruise) {
        await api.eliteConfirm({ profile_id: profile.id, confirmation_number: locateInput.trim() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refresh();
      } else {
        setLocateErr("We couldn't find a sailing for that confirmation number.");
      }
    } catch {
      setLocateErr("Couldn't check right now. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  const openGate = () => {
    setConfStep("enter");
    setConfInput("");
    setConfErr("");
    setPayCruiseId("");
    setPayMsg("");
    setPendingSession(null);
    setConfOpen(true);
  };

  const openPayDirect = async () => {
    setConfStep("pay");
    setConfInput("");
    setConfErr("");
    setPayCruiseId("");
    setPayMsg("");
    setPendingSession(null);
    try {
      setPayCruises(await api.cruises());
    } catch {
      /* ignore */
    }
    setConfOpen(true);
  };

  const handleContinue = async () => {
    if (!profile) return;
    const val = confInput.trim();
    if (val.length < 5) {
      setConfErr("Enter your booking confirmation number.");
      return;
    }
    setConfSaving(true);
    setConfErr("");
    try {
      const res = await api.resolveConfirmation(val);
      if (res.valid) {
        // booked through the advisor -> automatically in Elite, free
        await api.eliteConfirm({ profile_id: profile.id, confirmation_number: val });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await unlock("booking");
        await refresh();
        setConfOpen(false);
      } else if (res.reason === "used") {
        setConfErr("That confirmation number is already in use.");
      } else {
        // not an advisor booking -> pay $59, pick their sailing
        try {
          setPayCruises(await api.cruises());
        } catch {
          /* ignore */
        }
        setConfStep("pay");
      }
    } catch {
      setConfErr("Couldn't verify right now. Please try again.");
    } finally {
      setConfSaving(false);
    }
  };

  const finishUnlock = async (cid: string) => {
    if (!profile) return;
    if (profile.cruise_id !== cid) {
      await api.updateProfile(profile.id, {
        name: profile.name, age: profile.age, home_town: profile.home_town,
        cruise_id: cid, is_single: profile.is_single, bio: profile.bio, photo: profile.photo, vibe: profile.vibe,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await unlock("paid");
    await refresh();
    setPendingSession(null);
    setPayMsg("");
    setConfOpen(false);
    setSegment("cruise");
  };

  const checkPayment = async (sessionId: string, cid: string): Promise<boolean> => {
    try {
      const res = await api.verifyCheckout(sessionId);
      if (res.unlocked) {
        await finishUnlock(cid);
        return true;
      }
    } catch {
      /* keep polling */
    }
    return false;
  };

  const doPay = async (cid: string) => {
    if (!profile || !BACKEND_URL || !cid) return;
    setPaying(true);
    setPayMsg("");
    try {
      const { id, url } = await api.createCheckout({
        profile_id: profile.id,
        cruise_id: cid,
        origin: BACKEND_URL,
        confirmation_number: confInput.trim(),
      });
      setPendingSession(id);
      // Opens hosted Stripe checkout. On native this blocks until dismissed;
      // on web it opens a new tab and returns immediately — so we poll either way.
      await WebBrowser.openBrowserAsync(url);
      setPayMsg("Waiting for payment to complete…");
      // Poll the verify endpoint until Stripe reports the session paid.
      for (let i = 0; i < 40; i++) {
        const done = await checkPayment(id, cid);
        if (done) return;
        await new Promise((r) => setTimeout(r, 3000));
      }
      setPayMsg("Haven't detected your payment yet. If you completed it, tap “I've paid” below.");
    } catch (e: any) {
      setPayMsg("");
      Alert.alert("Couldn't start checkout", "Please try again in a moment.");
    } finally {
      setPaying(false);
    }
  };

  const gated = segment === "cruise" && !unlocked;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (segment === "community") {
        setMembers(await api.communityMembers(singlesOnly));
      } else if (profile) {
        setMembers(await api.members(profile.cruise_id, singlesOnly, profile.id));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [segment, singlesOnly, profile]);

  useFocusEffect(
    useCallback(() => {
      // Re-check unlock status on focus (covers returning from Stripe checkout).
      // Member loading is handled by the effect below (keyed on stable values)
      // to avoid redundant refetch loops.
      refresh();
    }, [refresh]),
  );

  // When the app returns to the foreground (e.g. back from the Stripe browser),
  // re-check the unlock so a completed payment reflects automatically.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Once access is unlocked (by any path), close the gate modal so the user
  // lands directly in the Elite feed instead of being stuck on the sheet.
  useEffect(() => {
    if (unlocked && confOpen) {
      setConfOpen(false);
      setPayMsg("");
      setPendingSession(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [unlocked, confOpen]);

  // Load the member feed only when the relevant inputs change (segment, filter,
  // gate state, or the user's cruise) — keyed on stable primitives to prevent
  // the refetch storm from unstable callback identities.
  useEffect(() => {
    if (!gated) load();
  }, [segment, singlesOnly, gated, profile?.cruise_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link from the "Join Icebreaker Elite" button: switch to My Cruise and
  // open the unlock gate (unless already unlocked).
  useEffect(() => {
    if (params.unlock === "1") {
      setSegment("cruise");
      if (!unlocked) openPayDirect();
      router.setParams({ unlock: undefined });
    }
  }, [params.unlock]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (params.goto === "cruise") {
      setSegment("cruise");
      router.setParams({ goto: undefined });
    }
  }, [params.goto]); // eslint-disable-line react-hooks/exhaustive-deps

  const doWave = async (m: Profile) => {
    if (waved[m.id]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWaved((w) => ({ ...w, [m.id]: true }));
    try {
      await api.wave(m.id);
      setMembers((list) =>
        list.map((x) => (x.id === m.id ? { ...x, waves_received: x.waves_received + 1 } : x)),
      );
    } catch {
      /* ignore */
    }
  };

  const chatId = segment === "community" ? "general" : profile?.cruise_id || "general";
  const chatTitle = segment === "community" ? "Community Chat" : cruise?.ship || "Cruise Chat";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <GlassFill overlay={glass.overlayStrong} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>The Icebreaker</Text>
          {cruise && (
            <Pressable
              testID="invite-button"
              style={styles.inviteBtn}
              onPress={() => shareInvite(cruise, profile?.name)}
            >
              <Ionicons name="share-social" size={16} color={colors.brand} />
              <Text style={styles.inviteText}>Invite</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.segment}>
          <SegBtn label="Community" active={segment === "community"} onPress={() => setSegment("community")} testID="segment-community" />
          <SegBtn label="My Cruise" active={segment === "cruise"} onPress={() => setSegment("cruise")} testID="segment-cruise" />
        </View>

        {!gated && (
          <View style={styles.controlsRow}>
            <Pressable
              testID="singles-filter"
              style={[styles.singlesChip, singlesOnly && styles.singlesChipOn]}
              onPress={() => {
                Haptics.selectionAsync();
                setSinglesOnly((s) => !s);
              }}
            >
              <Ionicons name="heart" size={14} color={singlesOnly ? colors.onBrand : colors.brand} />
              <Text style={[styles.singlesText, singlesOnly && { color: colors.onBrand }]}>Singles</Text>
            </Pressable>
            <Pressable
              testID="open-chat"
              style={styles.chatBtn}
              onPress={() => router.push({ pathname: "/chat/[cruiseId]", params: { cruiseId: chatId, title: chatTitle } })}
            >
              <Ionicons name="chatbubbles" size={16} color={colors.onBrand} />
              <Text style={styles.chatBtnText}>Group Chat</Text>
            </Pressable>
          </View>
        )}
      </View>

      {segment === "community" && !unlocked && (
        <Pressable
          testID="community-get-elite"
          style={styles.communityEliteBanner}
          onPress={() => { setSegment("cruise"); openPayDirect(); }}
        >
          <Ionicons name="diamond" size={16} color={colors.onBrand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.communityEliteTitle}>Get Icebreaker Elite</Text>
            <Text style={styles.communityEliteSub}>See exactly who's on your ship + private group chat.</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.onBrand} />
        </Pressable>
      )}

      {gated ? (
        <Gate
          shipName={cruise?.ship}
          onUnlock={openPayDirect}
          onCommunity={() => setSegment("community")}
          onBook={() => bookingBus.open()}
        />
      ) : loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing["2xl"] }} />
      ) : segment === "cruise" && unlocked && !profile?.cruise_id ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={styles.locateCard}>
            <GlassFill overlay={glass.overlayStrong} />
            <Ionicons name="navigate" size={26} color={colors.brand} />
            <Text style={styles.locateTitle}>Find your cruise</Text>
            <Text style={styles.locateSub}>You're in Icebreaker Elite! Enter your Virgin booking confirmation number to match you with your sailing.</Text>
            <TextInput
              testID="locate-input"
              value={locateInput}
              onChangeText={setLocateInput}
              placeholder="Confirmation number"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={styles.locateInput}
            />
            {!!locateErr && <Text style={styles.locateErr}>{locateErr}</Text>}
            <Pressable
              testID="locate-submit"
              style={[styles.locateBtn, locateInput.trim().length < 5 && { opacity: 0.5 }]}
              onPress={findMyCruise}
              disabled={locating || locateInput.trim().length < 5}
            >
              {locating ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.locateBtnText}>Find my cruise</Text>}
            </Pressable>
          </View>
        </ScrollView>
      ) : members.length === 0 ? (
        <Empty />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 150 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />
          }
        >
          {members.map((m) => (
            <View key={m.id} style={styles.pcard} testID={`member-card-${m.id}`}>
              <GlassFill />
              <View style={styles.photoWrap}>
                {m.photo ? (
                  <Image source={{ uri: m.photo }} style={styles.photo} contentFit="cover" contentPosition="top" transition={200} />
                ) : (
                  <View style={[styles.photo, styles.photoFallback]}>
                    <Avatar name={m.name} size={96} />
                  </View>
                )}
                <LinearGradient colors={["transparent", "rgba(28,32,31,0.9)"]} style={styles.pscrim} />
                {m.is_single && (
                  <View style={styles.singleBadge}>
                    <Ionicons name="heart" size={12} color="#fff" />
                    <Text style={styles.singleBadgeText}>Single</Text>
                  </View>
                )}
                <View style={styles.pinfo}>
                  <Text style={styles.pname}>
                    {m.name}
                    {m.age ? <Text style={styles.page}>, {m.age}</Text> : null}
                  </Text>
                  {!!m.home_town && (
                    <View style={styles.locRow}>
                      <Ionicons name="location" size={13} color="#fff" />
                      <Text style={styles.ploc}>{m.home_town}</Text>
                    </View>
                  )}
                  {!!m.bio && <Text style={styles.pbio} numberOfLines={2}>{m.bio}</Text>}
                </View>
              </View>
              <View style={styles.pactions}>
                {(m.vibe ? m.vibe.split(",").map((s) => s.trim()).filter(Boolean) : []).length > 0 && (
                  <View style={styles.vibeRow}>
                    {m.vibe.split(",").map((s) => s.trim()).filter(Boolean).map((v) => (
                      <View key={v} style={styles.vibeChip}>
                        <Text style={styles.vibeText}>{v}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.actionRow}>
                  <Text style={styles.waveCount}>👋 {m.waves_received}</Text>
                  {m.id !== profile?.id && (
                    <Pressable
                      testID={`message-${m.id}`}
                      style={styles.messageBtn}
                      onPress={() => router.push({ pathname: "/dm/[peerId]", params: { peerId: m.id, name: m.name } })}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.brand} />
                      <Text style={styles.messageBtnText}>Message</Text>
                    </Pressable>
                  )}
                  <Pressable
                    testID={`wave-${m.id}`}
                    style={[styles.waveBtn, waved[m.id] && styles.waveBtnOn]}
                    onPress={() => doWave(m)}
                  >
                    <Ionicons name="hand-left" size={16} color={waved[m.id] ? colors.onBrand : colors.brand} />
                    <Text style={[styles.waveBtnText, waved[m.id] && { color: colors.onBrand }]}>
                      {waved[m.id] ? "Waved" : "Wave"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={confOpen} transparent animationType="slide" onRequestClose={() => setConfOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.confBackdrop} onPress={() => setConfOpen(false)} />
          <View style={[styles.confSheet, { paddingBottom: insets.bottom + spacing.lg }]} testID="confirm-sheet">
            <GlassFill overlay={glass.overlayStrong} />
            <View style={styles.confHandle} />
            <Pressable testID="confirm-close" style={styles.confClose} onPress={() => setConfOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.onSurfaceTertiary} />
            </Pressable>
            <View style={styles.elitePill}>
              <Ionicons name="star" size={12} color={colors.onBrandTertiary} />
              <Text style={styles.elitePillText}>ICEBREAKER ELITE</Text>
            </View>

            {confStep === "enter" ? (
              <>
                <Text style={styles.confTitle}>Enter your confirmation #</Text>
                <Text style={styles.confSub}>
                  Use the Virgin Voyages confirmation number from your booking email. Booked through your advisor?
                  You'll unlock free. Booked elsewhere? You'll unlock for $59.
                </Text>
                <TextInput
                  testID="confirmation-input"
                  value={confInput}
                  onChangeText={setConfInput}
                  placeholder="e.g. VV1234567"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  style={styles.confInput}
                />
                {!!confErr && <Text style={styles.confErr}>{confErr}</Text>}
                <Pressable testID="confirm-submit" style={styles.confBtn} onPress={handleContinue} disabled={confSaving}>
                  {confSaving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.confBtnText}>Continue</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  testID="pay-back"
                  style={styles.payBack}
                  onPress={() => { setConfStep("enter"); setPayMsg(""); setPendingSession(null); }}
                  hitSlop={8}
                >
                  <Ionicons name="ticket" size={16} color={colors.brand} />
                  <Text style={styles.payBackText}>Booked with me? Enter confirmation # (free)</Text>
                </Pressable>
                <Text style={styles.confTitle}>Find your sailing</Text>
                <Text style={styles.confSub}>
                  Didn't book with me? No problem — Elite is a one-time $59. Pick your exact cruise by vessel, port
                  & date so you're matched with the right group.
                </Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: spacing.md, flexShrink: 1 }}>
                  {payCruises.map((c) => {
                    const on = payCruiseId === c.id;
                    const debark = (() => {
                      const d = new Date(c.sail_date);
                      d.setDate(d.getDate() + (c.nights || 0));
                      return d.toISOString().slice(0, 10);
                    })();
                    return (
                      <Pressable
                        key={c.id}
                        testID={`pay-cruise-${c.id}`}
                        style={[styles.pickRow, on && { borderColor: colors.brand }]}
                        onPress={() => setPayCruiseId(c.id)}
                      >
                        <Image source={{ uri: c.image }} style={styles.pickThumb} contentFit="cover" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pickShip}>{c.ship}</Text>
                          <Text style={styles.pickMeta}>⚓ {c.port} · {c.nights}N</Text>
                          <Text style={styles.pickMeta}>{formatDate(c.sail_date)} → {formatDate(debark)}</Text>
                        </View>
                        <Ionicons
                          name={on ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={on ? colors.brand : colors.borderStrong}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {Platform.OS === "ios" ? (
                  !payCruiseId ? (
                    <View style={[styles.confBtn, { backgroundColor: colors.borderStrong }]}>
                      <Text style={styles.confBtnText}>Select your sailing</Text>
                    </View>
                  ) : (
                    <EliteApplePayButton
                      profileId={profile!.id}
                      cruiseId={payCruiseId}
                      confirmationNumber={confInput.trim() || undefined}
                      onUnlocked={() => finishUnlock(payCruiseId)}
                      setMsg={setPayMsg}
                    />
                  )
                ) : (
                  <>
                    <Pressable
                      testID="pay-submit"
                      style={[styles.confBtn, !payCruiseId && { backgroundColor: colors.borderStrong }]}
                      onPress={() => doPay(payCruiseId)}
                      disabled={paying || !payCruiseId}
                    >
                      {paying ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.confBtnText}>Pay $59 & unlock</Text>}
                    </Pressable>
                    {!!pendingSession && (
                      <Pressable
                        testID="pay-recheck"
                        style={styles.recheckBtn}
                        onPress={async () => {
                          setPayMsg("Checking…");
                          const done = await checkPayment(pendingSession, payCruiseId);
                          if (!done) setPayMsg("Payment not confirmed yet. If you just paid, wait a few seconds and try again.");
                        }}
                      >
                        <Ionicons name="refresh" size={16} color={colors.brand} />
                        <Text style={styles.recheckText}>I've paid — check again</Text>
                      </Pressable>
                    )}
                  </>
                )}
                {!!payMsg && <Text testID="pay-status" style={styles.payMsg}>{payMsg}</Text>}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SegBtn({ label, active, onPress, testID }: any) {
  return (
    <Pressable testID={testID} style={[styles.segBtn, active && styles.segBtnOn]} onPress={onPress}>
      <Text style={[styles.segText, active && styles.segTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Gate({ shipName, onUnlock, onCommunity, onBook }: { shipName?: string; onUnlock: () => void; onCommunity: () => void; onBook: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.gateWrap}>
      <View style={styles.elitePill}>
        <Ionicons name="star" size={12} color={colors.onBrandTertiary} />
        <Text style={styles.elitePillText}>ICEBREAKER ELITE</Text>
      </View>
      <Text style={styles.gateTitle}>See who's on your cruise</Text>
      <Text style={styles.gateSub}>
        Everyone's welcome in the free Community. To see who's on {shipName || "your ship"}, choose how you'd like to join:
      </Text>

      {/* 1 — Book with me (perks + Elite free) */}
      <Pressable testID="crossroad-book" style={styles.crossBook} onPress={onBook}>
        <Ionicons name="boat" size={22} color={colors.onBrand} />
        <View style={styles.crossTextWrap}>
          <Text style={styles.crossBookTitle}>Book with me · Perks</Text>
          <Text style={styles.crossBookSub}>Same price as direct + extra perks. Book with me and Elite is FREE.</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.onBrand} />
      </Pressable>

      {/* 2 — Icebreaker Elite (confirmation # free, or $59) */}
      <Pressable testID="crossroad-elite" style={styles.crossElite} onPress={onUnlock}>
        <Ionicons name="diamond" size={22} color={colors.brand} />
        <View style={styles.crossTextWrap}>
          <Text style={styles.crossEliteTitle}>Get Icebreaker Elite</Text>
          <Text style={styles.crossEliteSub}>Booked with me? Enter your confirmation # — FREE. Booked elsewhere? A one-time $59.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
      </Pressable>

      {/* 3 — General admission (free Community) */}
      <Pressable testID="crossroad-community" style={styles.crossCommunity} onPress={onCommunity}>
        <Ionicons name="people" size={22} color={colors.onSurfaceTertiary} />
        <View style={styles.crossTextWrap}>
          <Text style={styles.crossCommunityTitle}>General admission — Community</Text>
          <Text style={styles.crossCommunitySub}>Free. Mingle with everyone sailing soon.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
      </Pressable>
    </ScrollView>
  );
}

function Empty() {
  return (
    <View style={styles.emptyWrap}>
      <Image
        source={{ uri: "https://images.pexels.com/photos/6405762/pexels-photo-6405762.jpeg?auto=compress&cs=tinysrgb&w=800" }}
        style={styles.emptyImg}
        contentFit="cover"
      />
      <Text style={styles.emptyTitle}>Be the first to break the ice!</Text>
      <Text style={styles.emptySub}>No one here yet. Invite your cruise mates to join.</Text>
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
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  inviteText: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    padding: 4,
    marginTop: spacing.md,
  },
  segBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.pill },
  segBtnOn: { backgroundColor: colors.surfaceSecondary, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segText: { fontSize: font.base, color: colors.onSurfaceTertiary },
  segTextOn: { color: colors.onSurface, fontWeight: "500" },
  controlsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  singlesChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
  },
  singlesChipOn: { backgroundColor: colors.brand },
  singlesText: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSecondary,
    marginLeft: "auto",
  },
  chatBtnText: { color: colors.onBrand, fontSize: font.base, fontWeight: "500" },
  pcard: {
    backgroundColor: "transparent",
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: glass.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  photoWrap: { width: "100%", aspectRatio: 3 / 4 },
  photo: { width: "100%", height: "100%" },
  photoFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  pscrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  singleBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  singleBadgeText: { color: "#fff", fontSize: font.sm, fontWeight: "500" },
  pinfo: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
  pname: { color: "#fff", fontSize: font["2xl"], fontWeight: "500" },
  page: { color: "#fff", fontSize: font.xl, fontWeight: "400" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  ploc: { color: "#fff", fontSize: font.sm },
  pbio: { color: "rgba(255,255,255,0.95)", fontSize: font.base, marginTop: spacing.sm, lineHeight: 20 },
  pactions: { flexDirection: "column", gap: spacing.sm, padding: spacing.md },
  vibeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  actionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: spacing.sm },
  vibeChip: { backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  vibeText: { color: colors.onBrandTertiary, fontSize: font.sm, fontWeight: "500" },
  waveCount: { fontSize: font.base, color: colors.onSurfaceTertiary, marginRight: "auto" },
  waveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  waveBtnOn: { backgroundColor: colors.brand },
  waveBtnText: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  messageBtnText: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  gateWrap: { alignItems: "center", padding: spacing.xl, paddingTop: spacing["3xl"] },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  gateTitle: { fontSize: font.xl, fontWeight: "500", color: colors.onSurface, marginTop: spacing.md },
  elitePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  elitePillText: { color: colors.onBrandTertiary, fontSize: font.sm, fontWeight: "500", letterSpacing: 1 },
  gateSub: { fontSize: font.base, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm, lineHeight: 21 },
  gatePreview: { alignSelf: "stretch", marginTop: spacing.xl, gap: spacing.sm },
  gateBlurCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  gateBlurAvatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.border },
  gateBlurLines: { flex: 1, gap: spacing.sm },
  gateBlurLine: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
  gatePrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignSelf: "stretch",
    marginTop: spacing.xl,
  },
  gatePrimaryText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  gateOr: { color: colors.muted, marginVertical: spacing.md },
  gateSecondary: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  gateSecondaryText: { color: colors.onSurface, fontSize: font.base, fontWeight: "500" },
  gateNote: { color: colors.muted, fontSize: font.sm, marginTop: spacing.md, textAlign: "center" },
  crossTextWrap: { flex: 1 },
  crossBook: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brand,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignSelf: "stretch",
    marginTop: spacing.xl,
  },
  crossBookTitle: { color: colors.onBrand, fontSize: font.lg, fontWeight: "600" },
  crossBookSub: { color: colors.onBrandTertiary, fontSize: font.sm, marginTop: 2, lineHeight: 18 },
  crossElite: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.brand,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignSelf: "stretch",
    marginTop: spacing.md,
  },
  crossEliteTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "600" },
  crossEliteSub: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2, lineHeight: 18 },
  crossCommunity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignSelf: "stretch",
    marginTop: spacing.md,
  },
  crossCommunityTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: "500" },
  crossCommunitySub: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
  communityEliteBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  communityEliteTitle: { color: colors.onBrand, fontSize: font.sm, fontWeight: "600" },
  communityEliteSub: { color: colors.onBrandTertiary, fontSize: font.sm, marginTop: 1, lineHeight: 15 },
  locateCard: { backgroundColor: "transparent", overflow: "hidden", borderRadius: radius.lg, borderWidth: 1, borderColor: glass.border, padding: spacing.xl, alignItems: "center", marginTop: spacing.md },
  locateTitle: { color: colors.onSurface, fontSize: font.xl, fontWeight: "600", marginTop: spacing.sm },
  locateSub: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: "center", marginTop: spacing.xs, lineHeight: 20 },
  locateInput: { alignSelf: "stretch", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: font.lg, color: colors.onSurface, letterSpacing: 1, textAlign: "center", marginTop: spacing.lg },
  locateErr: { color: colors.brand, fontSize: font.sm, marginTop: spacing.sm, textAlign: "center" },
  locateBtn: { alignSelf: "stretch", backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.md },
  locateBtnText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  emptyWrap: { alignItems: "center", padding: spacing.xl, paddingTop: spacing["2xl"] },
  emptyImg: { width: "100%", height: 180, borderRadius: radius.lg },
  emptyTitle: { fontSize: font.lg, fontWeight: "500", color: colors.onSurface, marginTop: spacing.lg },
  emptySub: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: spacing.xs, textAlign: "center" },
  confBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  confSheet: { backgroundColor: "transparent", overflow: "hidden", borderTopWidth: 1, borderColor: glass.border, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, maxHeight: "85%" },
  confHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, marginBottom: spacing.lg },
  confClose: { position: "absolute", top: spacing.md, right: spacing.md, padding: spacing.xs, zIndex: 5 },
  payBack: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", marginBottom: spacing.xs },
  payBackText: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  confTitle: { fontSize: font.xl, fontWeight: "500", color: colors.onSurface, marginTop: spacing.md },
  confSub: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: spacing.xs, lineHeight: 20 },
  confInput: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: font.lg, color: colors.onSurface, marginTop: spacing.lg, letterSpacing: 1 },
  confErr: { color: colors.error, fontSize: font.sm, marginTop: spacing.sm },
  confBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.lg },
  confBtnText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  payMsg: { color: colors.onSurfaceTertiary, fontSize: font.sm, textAlign: "center", marginTop: spacing.md, lineHeight: 18 },
  recheckBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: spacing.md, marginTop: spacing.xs },
  recheckText: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  pickerSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "80%" },
  pickRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  pickThumb: { width: 52, height: 52, borderRadius: radius.sm },
  pickShip: { fontSize: font.base, fontWeight: "500", color: colors.onSurface },
  pickMeta: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
});
