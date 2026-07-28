import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, Cruise, Deal } from "@/src/api";
import { storage } from "@/src/utils/storage";
import { colors, spacing, radius, font } from "@/src/theme";

const SHIPS = ["Scarlet Lady", "Valiant Lady", "Resilient Lady", "Brilliant Lady"];
const REGIONS = ["Caribbean", "Mediterranean", "Mexican Riviera"];
const PIN_KEY = "icebreaker_admin_pin";

type Tab = "cruises" | "deals" | "codes";

export default function Admin() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [checking, setChecking] = useState(false);

  const [tab, setTab] = useState<Tab>("cruises");
  const [cruises, setCruises] = useState<Cruise[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null); // object with type
  const [modalOpen, setModalOpen] = useState(false);
  const [confList, setConfList] = useState<any[]>([]);
  const [confNum, setConfNum] = useState("");
  const [confCruiseId, setConfCruiseId] = useState("");
  const [confBusy, setConfBusy] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState("");

  useEffect(() => {
    storage.getItem(PIN_KEY, "").then((p) => {
      if (p) setPin(p as string);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([api.cruises(), api.deals()]);
      setCruises(c);
      setDeals(d);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfs = useCallback(async () => {
    if (!pin) return;
    try {
      setConfList(await api.adminListConfirmations(pin));
    } catch {
      /* ignore */
    }
  }, [pin]);

  useEffect(() => {
    if (pin) {
      load();
      loadConfs();
    }
  }, [pin, load, loadConfs]);

  const addConfirmation = async () => {
    if (!pin || confNum.trim().length < 5 || !confCruiseId) return;
    setConfBusy(true);
    try {
      await api.adminCreateConfirmation(pin, { confirmation_number: confNum.trim(), cruise_id: confCruiseId });
      setConfNum("");
      setConfCruiseId("");
      loadConfs();
    } finally {
      setConfBusy(false);
    }
  };

  const delConfirmation = async (num: string) => {
    if (!pin) return;
    await api.adminDeleteConfirmation(pin, num);
    loadConfs();
  };

  const addBulkConfirmations = async () => {
    if (!pin || bulkText.trim().length < 5 || !confCruiseId) return;
    setConfBusy(true);
    setBulkResult("");
    try {
      const res = await api.adminBulkConfirmations(pin, { numbers: bulkText, cruise_id: confCruiseId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBulkResult(`Imported ${res.added} confirmation${res.added === 1 ? "" : "s"}${res.skipped ? ` · ${res.skipped} skipped (too short)` : ""}.`);
      setBulkText("");
      setConfCruiseId("");
      loadConfs();
    } finally {
      setConfBusy(false);
    }
  };

  const submitPin = async () => {
    setChecking(true);
    setPinError("");
    try {
      const res = await api.adminVerify(pinInput.trim());
      if (res.ok) {
        await storage.setItem(PIN_KEY, pinInput.trim());
        setPin(pinInput.trim());
      } else {
        setPinError("Incorrect PIN. Try again.");
      }
    } catch {
      setPinError("Could not verify. Check connection.");
    } finally {
      setChecking(false);
    }
  };

  const openNew = (type: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing({ type, isNew: true });
    setModalOpen(true);
  };
  const openEdit = (type: Tab, item: any) => {
    setEditing({ type, isNew: false, item });
    setModalOpen(true);
  };

  const del = async (type: Tab, id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (type === "cruises") await api.adminDeleteCruise(pin!, id);
    else await api.adminDeleteDeal(pin!, id);
    load();
  };

  // ---------- PIN gate ----------
  if (!pin) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable testID="admin-back" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Admin</Text>
        </View>
        <View style={styles.pinWrap}>
          <View style={styles.gateIcon}><Ionicons name="key" size={28} color={colors.brand} /></View>
          <Text style={styles.pinTitle}>Enter admin PIN</Text>
          <Text style={styles.pinSub}>Manage sailings & deals</Text>
          <TextInput
            testID="admin-pin-input"
            value={pinInput}
            onChangeText={setPinInput}
            placeholder="PIN"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.pinInput}
          />
          {!!pinError && <Text style={styles.errText}>{pinError}</Text>}
          <Pressable testID="admin-pin-submit" style={styles.primaryBtn} onPress={submitPin} disabled={checking}>
            {checking ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.primaryBtnText}>Unlock</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ---------- Dashboard ----------
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="admin-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Content</Text>
      </View>

      <View style={styles.segment}>
        {(["cruises", "deals", "codes"] as Tab[]).map((t) => (
          <Pressable key={t} testID={`admin-seg-${t}`} style={[styles.segBtn, tab === t && styles.segBtnOn]} onPress={() => setTab(t)}>
            <Text style={[styles.segText, tab === t && styles.segTextOn]}>
              {t === "cruises" ? "Sailings" : t === "deals" ? "Deals" : "Booking #s"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "codes" ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
          <Text style={styles.rowSub}>Add each client's Virgin confirmation number and map it to their sailing. When they enter it in the app, Icebreaker Elite unlocks free.</Text>

          <View style={styles.modeToggle}>
            <Pressable testID="conf-mode-single" style={[styles.modeBtn, !bulkMode && styles.modeBtnOn]} onPress={() => { setBulkMode(false); setBulkResult(""); }}>
              <Text style={[styles.modeText, !bulkMode && styles.modeTextOn]}>Single</Text>
            </Pressable>
            <Pressable testID="conf-mode-bulk" style={[styles.modeBtn, bulkMode && styles.modeBtnOn]} onPress={() => { setBulkMode(true); setBulkResult(""); }}>
              <Text style={[styles.modeText, bulkMode && styles.modeTextOn]}>Bulk import</Text>
            </Pressable>
          </View>

          {bulkMode ? (
            <TextInput
              testID="conf-bulk-input"
              value={bulkText}
              onChangeText={setBulkText}
              placeholder={"Paste confirmation numbers\n(one per line, or comma separated)"}
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              multiline
              style={[styles.pinInput, { marginTop: spacing.lg, textAlign: "left", minHeight: 140, textAlignVertical: "top", paddingTop: spacing.md }]}
            />
          ) : (
            <TextInput
              testID="conf-number-input"
              value={confNum}
              onChangeText={setConfNum}
              placeholder="Confirmation number"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={[styles.pinInput, { marginTop: spacing.lg, textAlign: "left" }]}
            />
          )}
          <Text style={[styles.rowSub, { marginTop: spacing.md, marginBottom: spacing.xs }]}>Assign to sailing:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
            {cruises.map((c) => {
              const on = confCruiseId === c.id;
              return (
                <Pressable key={c.id} testID={`conf-cruise-${c.id}`} onPress={() => setConfCruiseId(c.id)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.ship} · {c.sail_date.slice(5)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {bulkMode ? (
            <Pressable testID="conf-bulk-add" style={[styles.addBtn, { marginTop: spacing.md }]} onPress={addBulkConfirmations} disabled={confBusy || bulkText.trim().length < 5 || !confCruiseId}>
              {confBusy ? <ActivityIndicator color={colors.onBrand} /> : (<><Ionicons name="cloud-upload" size={20} color={colors.onBrand} /><Text style={styles.addBtnText}>Import list</Text></>)}
            </Pressable>
          ) : (
            <Pressable testID="conf-add" style={[styles.addBtn, { marginTop: spacing.md }]} onPress={addConfirmation} disabled={confBusy || confNum.trim().length < 5 || !confCruiseId}>
              {confBusy ? <ActivityIndicator color={colors.onBrand} /> : (<><Ionicons name="add-circle" size={20} color={colors.onBrand} /><Text style={styles.addBtnText}>Add confirmation #</Text></>)}
            </Pressable>
          )}
          {!!bulkResult && <Text testID="conf-bulk-result" style={[styles.rowSub, { color: colors.brand, marginTop: spacing.xs }]}>{bulkResult}</Text>}

          {confList.map((cf) => (
            <View key={cf.confirmation_number} style={styles.row} testID={`admin-conf-${cf.confirmation_number}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{cf.confirmation_number}</Text>
                <Text style={styles.rowSub}>{cf.ship} · {cf.sail_date} · {cf.used ? "Used ✓" : "Unused"}</Text>
              </View>
              <Pressable testID={`admin-del-conf-${cf.confirmation_number}`} onPress={() => delConfirmation(cf.confirmation_number)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing["2xl"] }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"] }}>
          <Pressable testID="admin-add" style={styles.addBtn} onPress={() => openNew(tab)}>
            <Ionicons name="add-circle" size={20} color={colors.onBrand} />
            <Text style={styles.addBtnText}>Add {tab === "cruises" ? "sailing" : "deal"}</Text>
          </Pressable>

          {tab === "cruises"
            ? cruises.map((c) => (
                <View key={c.id} style={styles.row} testID={`admin-cruise-${c.id}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{c.ship}</Text>
                    <Text style={styles.rowSub}>{c.sail_date} · {c.nights}N · {c.port}</Text>
                  </View>
                  <Pressable testID={`admin-edit-cruise-${c.id}`} onPress={() => openEdit("cruises", c)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={22} color={colors.brandSecondary} />
                  </Pressable>
                  <Pressable testID={`admin-del-cruise-${c.id}`} onPress={() => del("cruises", c.id)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={22} color={colors.error} />
                  </Pressable>
                </View>
              ))
            : deals.map((d) => (
                <View key={d.id} style={styles.row} testID={`admin-deal-${d.id}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{d.title}</Text>
                    <Text style={styles.rowSub}>{d.ship} · ${d.deal_price} (was ${d.base_price})</Text>
                  </View>
                  <Pressable testID={`admin-edit-deal-${d.id}`} onPress={() => openEdit("deals", d)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={22} color={colors.brandSecondary} />
                  </Pressable>
                  <Pressable testID={`admin-del-deal-${d.id}`} onPress={() => del("deals", d.id)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={22} color={colors.error} />
                  </Pressable>
                </View>
              ))}
        </ScrollView>
      )}

      {modalOpen && editing && (
        <EditModal
          pin={pin}
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </View>
  );
}

function EditModal({ pin, editing, onClose, onSaved }: any) {
  const isCruise = editing.type === "cruises";
  const item = editing.item || {};
  const [saving, setSaving] = useState(false);

  // shared
  const [ship, setShip] = useState(item.ship || SHIPS[0]);
  const [region, setRegion] = useState(item.region || REGIONS[0]);
  const [nights, setNights] = useState(item.nights ? String(item.nights) : "");
  // cruise
  const [port, setPort] = useState(item.port || "");
  const [sailDate, setSailDate] = useState(item.sail_date || "");
  const [itinerary, setItinerary] = useState((item.itinerary || []).join(", "));
  // deal
  const [title, setTitle] = useState(item.title || "");
  const [basePrice, setBasePrice] = useState(item.base_price ? String(item.base_price) : "");
  const [dealPrice, setDealPrice] = useState(item.deal_price ? String(item.deal_price) : "");
  const [perks, setPerks] = useState((item.perks || []).join(", "));
  const [tag, setTag] = useState(item.tag || "");

  const save = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      if (isCruise) {
        const body = {
          ship,
          port,
          region,
          sail_date: sailDate,
          nights: parseInt(nights || "0", 10),
          itinerary: itinerary.split(",").map((s: string) => s.trim()).filter(Boolean),
        };
        if (editing.isNew) await api.adminCreateCruise(pin, body);
        else await api.adminUpdateCruise(pin, item.id, body);
      } else {
        const body = {
          title,
          ship,
          region,
          nights: parseInt(nights || "0", 10),
          base_price: parseFloat(basePrice || "0"),
          deal_price: parseFloat(dealPrice || "0"),
          perks: perks.split(",").map((s: string) => s.trim()).filter(Boolean),
          tag,
        };
        if (editing.isNew) await api.adminCreateDeal(pin, body);
        else await api.adminUpdateDeal(pin, item.id, body);
      }
      onSaved();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>
              {editing.isNew ? "Add" : "Edit"} {isCruise ? "sailing" : "deal"}
            </Text>

            <Label>Ship</Label>
            <ChipRow options={SHIPS} value={ship} onChange={setShip} />
            <Label>Region</Label>
            <ChipRow options={REGIONS} value={region} onChange={setRegion} />

            {isCruise ? (
              <>
                <Label>Departure port</Label>
                <Inp value={port} onChangeText={setPort} placeholder="Miami, FL" />
                <Label>Sail date (YYYY-MM-DD)</Label>
                <Inp value={sailDate} onChangeText={setSailDate} placeholder="2026-09-01" />
                <Label>Nights</Label>
                <Inp value={nights} onChangeText={setNights} placeholder="5" keyboardType="number-pad" />
                <Label>Itinerary (comma separated)</Label>
                <Inp value={itinerary} onChangeText={setItinerary} placeholder="Miami, Bimini, Cozumel, Miami" />
              </>
            ) : (
              <>
                <Label>Title</Label>
                <Inp value={title} onChangeText={setTitle} placeholder="Summer Caribbean Escape" />
                <Label>Nights</Label>
                <Inp value={nights} onChangeText={setNights} placeholder="5" keyboardType="number-pad" />
                <View style={{ flexDirection: "row", gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Label>Original $</Label>
                    <Inp value={basePrice} onChangeText={setBasePrice} placeholder="1450" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label>Deal $</Label>
                    <Inp value={dealPrice} onChangeText={setDealPrice} placeholder="1150" keyboardType="decimal-pad" />
                  </View>
                </View>
                <Label>Perks (comma separated)</Label>
                <Inp value={perks} onChangeText={setPerks} placeholder="$300 Bar Tab, Free WiFi" />
                <Label>Tag</Label>
                <Inp value={tag} onChangeText={setTag} placeholder="Hot Deal" />
              </>
            )}

            <Pressable testID="admin-save" style={styles.primaryBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.primaryBtnText}>Save</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const Label = ({ children }: any) => <Text style={styles.label}>{children}</Text>;
const Inp = (props: any) => <TextInput {...props} placeholderTextColor={colors.muted} style={styles.input} />;
function ChipRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
      {options.map((o) => {
        const on = value === o;
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: font.lg, fontWeight: "500", color: colors.onSurface },
  pinWrap: { alignItems: "center", padding: spacing.xl, paddingTop: spacing["3xl"] },
  gateIcon: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  pinTitle: { fontSize: font.xl, fontWeight: "500", color: colors.onSurface, marginTop: spacing.lg },
  pinSub: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: spacing.xs },
  pinInput: {
    alignSelf: "stretch",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: font.lg,
    color: colors.onSurface,
    marginTop: spacing.xl,
    textAlign: "center",
  },
  errText: { color: colors.error, fontSize: font.sm, marginTop: spacing.sm },
  primaryBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", alignSelf: "stretch", marginTop: spacing.lg },
  primaryBtnText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "500" },
  segment: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, padding: 4, margin: spacing.lg },
  segBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.pill },
  modeToggle: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, padding: 4, marginTop: spacing.md },
  modeBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.pill },
  modeBtnOn: { backgroundColor: colors.surfaceSecondary },
  modeText: { fontSize: font.base, color: colors.onSurfaceTertiary },
  modeTextOn: { color: colors.onSurface, fontWeight: "500" },
  segBtnOn: { backgroundColor: colors.surfaceSecondary },
  segText: { fontSize: font.base, color: colors.onSurfaceTertiary },
  segTextOn: { color: colors.onSurface, fontWeight: "500" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.brand, paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  addBtnText: { color: colors.onBrand, fontSize: font.base, fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowTitle: { fontSize: font.base, fontWeight: "500", color: colors.onSurface },
  rowSub: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  iconBtn: { padding: spacing.sm },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, maxHeight: "88%" },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, marginBottom: spacing.lg },
  sheetTitle: { fontSize: font.xl, fontWeight: "500", color: colors.onSurface, marginBottom: spacing.sm },
  label: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: spacing.lg, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: font.base, color: colors.onSurface },
  chip: { height: 36, paddingHorizontal: spacing.lg, justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexShrink: 0 },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: font.base, color: colors.onSurfaceTertiary },
  chipTextOn: { color: colors.onBrand, fontWeight: "500" },
});
