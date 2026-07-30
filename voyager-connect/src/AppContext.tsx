import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, Cruise, Profile, STORAGE_KEYS } from "@/src/api";

type AppState = {
  ready: boolean;
  profile: Profile | null;
  cruise: Cruise | null;
  unlocked: boolean;
  unlockMethod: string | null;
  setProfile: (p: Profile | null) => void;
  refresh: () => Promise<void>;
  unlock: (method: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AppState>({} as AppState);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [cruise, setCruise] = useState<Cruise | null>(null);
  const [unlockMethod, setUnlockMethod] = useState<string | null>(null);

  const loadUnlock = useCallback(async (pid?: string) => {
    if (!pid) {
      setUnlockMethod(null);
      return;
    }
    const m = await storage.getItem(STORAGE_KEYS.unlockPrefix + pid, "");
    setUnlockMethod((m as string) || null);
  }, []);

  const loadCruise = useCallback(async (cruiseId?: string) => {
    if (!cruiseId) return setCruise(null);
    try {
      setCruise(await api.cruise(cruiseId));
    } catch {
      setCruise(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const id = await storage.getItem(STORAGE_KEYS.profileId, "");
    if (!id) {
      setProfileState(null);
      setCruise(null);
      setUnlockMethod(null);
      return;
    }
    try {
      const p = await api.getProfile(id as string);
      setProfileState(p);
      await loadCruise(p.cruise_id);
      const localMethod = await storage.getItem(STORAGE_KEYS.unlockPrefix + p.id, "");
      if (localMethod) {
        setUnlockMethod(localMethod as string);
      } else {
        // Restore a paid/booked unlock recorded server-side (survives reloads / new devices)
        try {
          const st = await api.eliteStatus(p.id);
          if (st.unlocked) {
            const method = st.method || "paid";
            await storage.setItem(STORAGE_KEYS.unlockPrefix + p.id, method);
            setUnlockMethod(method);
            if (st.cruise_id && st.cruise_id !== p.cruise_id) await loadCruise(st.cruise_id);
          } else {
            setUnlockMethod(null);
          }
        } catch {
          setUnlockMethod(null);
        }
      }
    } catch {
      setProfileState(null);
      setCruise(null);
      setUnlockMethod(null);
    }
  }, [loadCruise, loadUnlock]);

  const setProfile = useCallback(
    (p: Profile | null) => {
      setProfileState(p);
      if (p) {
        storage.setItem(STORAGE_KEYS.profileId, p.id);
        loadCruise(p.cruise_id);
        loadUnlock(p.id);
      }
    },
    [loadCruise, loadUnlock],
  );

  const unlock = useCallback(
    async (method: string) => {
      if (!profile) return;
      await storage.setItem(STORAGE_KEYS.unlockPrefix + profile.id, method);
      setUnlockMethod(method);
    },
    [profile],
  );

  const signOut = useCallback(async () => {
    await storage.removeItem(STORAGE_KEYS.profileId);
    setProfileState(null);
    setCruise(null);
    setUnlockMethod(null);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  return (
    <Ctx.Provider
      value={{
        ready,
        profile,
        cruise,
        unlocked: !!unlockMethod,
        unlockMethod,
        setProfile,
        refresh,
        unlock,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
