/*
 * App store: one WSState per signed-in user, persisted on the device, recomputed through the engine.
 * Rules (CLAUDE.md):
 *  - Screens read state with useApp() and change it only with update(fn) / replace(state).
 *  - Money logic lives in @woodstock/engine; an update mutator calls engine functions, it never does
 *    arithmetic of its own.
 *  - Adapters do I/O; the store persists. Owner: mobile-lead.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { seedState, type WSState } from "@woodstock/engine";
import { adapters } from "@/adapters";
import type { Session } from "@/adapters";
import { getJSON, setJSON, remove } from "@/adapters/storage";

type AppValue = {
  ready: boolean;
  session: Session | null;
  state: WSState | null;
  /* true once onboarding finished (or Skip), so routing goes to the tabs */
  onboarded: boolean;
  adapters: typeof adapters;
  update: (fn: (draft: WSState) => WSState | void) => void;
  replace: (s: WSState) => void;
  setSession: (s: Session | null) => void;
  finishOnboarding: (s: WSState) => Promise<void>;
  startDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<AppValue | null>(null);
const stateKey = (userId: string) => "state." + userId;
const onboardedKey = (userId: string) => "onboarded." + userId;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSessionState] = useState<Session | null>(null);
  const [state, setState] = useState<WSState | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<WSState | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const s = await adapters.auth.currentUser();
      if (!live) return;
      if (s) {
        const [st, ob] = await Promise.all([getJSON<WSState | null>(stateKey(s.userId), null), getJSON<boolean>(onboardedKey(s.userId), false)]);
        if (!live) return;
        setSessionState(s);
        setState(st);
        latest.current = st;
        setOnboarded(!!ob && !!st);
      }
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  const persist = useCallback((s: WSState, userId: string) => {
    latest.current = s;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setJSON(stateKey(userId), latest.current), 250);
  }, []);

  const update = useCallback(
    (fn: (draft: WSState) => WSState | void) => {
      setState((prev) => {
        if (!prev) return prev;
        const draft = JSON.parse(JSON.stringify(prev)) as WSState;
        const out = (fn(draft) ?? draft) as WSState;
        if (session) persist(out, session.userId);
        return out;
      });
    },
    [session, persist]
  );

  const replace = useCallback(
    (s: WSState) => {
      setState(s);
      if (session) persist(s, session.userId);
    },
    [session, persist]
  );

  const finishOnboarding = useCallback(
    async (s: WSState) => {
      const sess = session ?? (await adapters.auth.currentUser());
      if (!sess) return;
      setState(s);
      latest.current = s;
      await setJSON(stateKey(sess.userId), s);
      await setJSON(onboardedKey(sess.userId), true);
      setOnboarded(true);
    },
    [session]
  );

  const startDemo = useCallback(async () => {
    const s = await adapters.auth.startDemo();
    const st = seedState();
    setSessionState(s);
    setState(st);
    latest.current = st;
    await setJSON(stateKey(s.userId), st);
    await setJSON(onboardedKey(s.userId), true);
    setOnboarded(true);
  }, []);

  const signOut = useCallback(async () => {
    await adapters.auth.signOut();
    setSessionState(null);
    setState(null);
    setOnboarded(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (session) {
      await remove(stateKey(session.userId));
      await remove(onboardedKey(session.userId));
    }
    await adapters.auth.deleteAccount();
    setSessionState(null);
    setState(null);
    setOnboarded(false);
  }, [session]);

  const value = useMemo<AppValue>(
    () => ({ ready, session, state, onboarded, adapters, update, replace, setSession: setSessionState, finishOnboarding, startDemo, signOut, deleteAccount }),
    [ready, session, state, onboarded, update, replace, finishOnboarding, startDemo, signOut, deleteAccount]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

/* Convenience for screens that only render once there is a state (inside the tabs). */
export function useWS(): WSState {
  const { state } = useApp();
  if (!state) throw new Error("No state: this screen must sit behind the onboarding guard");
  return state;
}
