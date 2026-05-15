"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { AppState, User, BillingPeriod, Report } from "@/types";
import * as api from "./sheets-api";

// ── Initial / fallback state ──────────────────────────────────────────────────

const INITIAL_STATE: AppState = {
  users: [
    { id: "1", name: "Juan García" },
    { id: "2", name: "María López" },
    { id: "3", name: "Carlos Rodríguez" },
  ],
  periods: [
    { id: "1", name: "1ra Quincena Mayo 2026", startDate: "2026-05-01", endDate: "2026-05-15" },
    { id: "2", name: "2da Quincena Mayo 2026", startDate: "2026-05-16", endDate: "2026-05-31" },
    { id: "3", name: "1ra Quincena Junio 2026", startDate: "2026-06-01", endDate: "2026-06-15" },
  ],
  reports: [],
  areas: ["Proyectos", "Administración", "Marketing", "Contabilidad", "Comercial / Ventas", "I+D"],
};

const STORAGE_KEY = "zota-dashboard-v1";

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "HYDRATE"; payload: AppState }
  | { type: "ADD_PERIOD"; payload: BillingPeriod }
  | { type: "UPDATE_PERIOD"; payload: BillingPeriod }
  | { type: "DELETE_PERIOD"; payload: string }
  | { type: "ADD_USER"; payload: User }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "DELETE_USER"; payload: string }
  | { type: "ADD_AREA"; payload: string }
  | { type: "DELETE_AREA"; payload: string }
  | { type: "SUBMIT_REPORT"; payload: Report }
  | { type: "DELETE_REPORT"; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":        return action.payload;
    case "ADD_PERIOD":     return { ...state, periods: [...state.periods, action.payload] };
    case "UPDATE_PERIOD":  return { ...state, periods: state.periods.map(p => p.id === action.payload.id ? action.payload : p) };
    case "DELETE_PERIOD":  return { ...state, periods: state.periods.filter(p => p.id !== action.payload) };
    case "ADD_USER":       return { ...state, users: [...state.users, action.payload] };
    case "UPDATE_USER":    return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    case "DELETE_USER":    return { ...state, users: state.users.filter(u => u.id !== action.payload) };
    case "ADD_AREA":       return { ...state, areas: [...state.areas, action.payload] };
    case "DELETE_AREA":    return { ...state, areas: state.areas.filter(a => a !== action.payload) };
    case "SUBMIT_REPORT":  return { ...state, reports: [...state.reports, action.payload] };
    case "DELETE_REPORT":  return { ...state, reports: state.reports.filter(r => r.id !== action.payload) };
    default:               return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface StoreContextValue {
  state: AppState;
  dispatch: (action: Action) => void;
  loading: boolean;
  syncing: boolean;
  offlineMode: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, localDispatch] = useReducer(reducer, INITIAL_STATE);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [offlineMode, setOffline]   = useState(false);

  const sheetsEnabled = !!process.env.NEXT_PUBLIC_SHEETS_API_URL;

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (sheetsEnabled) {
        try {
          const remote = await api.fetchAllData();
          localDispatch({ type: "HYDRATE", payload: remote });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
          setOffline(false);
        } catch {
          // Sheets unreachable — try localStorage cache
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            localDispatch({ type: "HYDRATE", payload: JSON.parse(cached) });
          }
          setOffline(true);
        }
      } else {
        // No Sheets URL configured — use localStorage only
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          localDispatch({ type: "HYDRATE", payload: JSON.parse(cached) });
        }
        setOffline(true);
      }
      setLoading(false);
    }
    load();
  }, [sheetsEnabled]);

  // ── Persist to localStorage whenever state changes ───────────────────────────
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, loading]);

  // ── Dispatch: optimistic local update + background Sheets sync ───────────────
  const dispatch = useCallback(async (action: Action) => {
    localDispatch(action); // instant — no wait

    if (!sheetsEnabled || offlineMode) return;

    setSyncing(true);
    try {
      switch (action.type) {
        case "ADD_USER":      await api.addUser(action.payload);      break;
        case "UPDATE_USER":   await api.updateUser(action.payload);   break;
        case "DELETE_USER":   await api.deleteUser(action.payload);   break;
        case "ADD_PERIOD":    await api.addPeriod(action.payload);    break;
        case "UPDATE_PERIOD": await api.updatePeriod(action.payload); break;
        case "DELETE_PERIOD": await api.deletePeriod(action.payload); break;
        case "ADD_AREA":      await api.addArea(action.payload);      break;
        case "DELETE_AREA":   await api.deleteArea(action.payload);   break;
        case "SUBMIT_REPORT": await api.submitReport(action.payload); break;
        case "DELETE_REPORT": await api.deleteReport(action.payload); break;
      }
    } catch (err) {
      console.error("[Sheets sync error]", err);
      // Don't revert — local state is the source of truth as fallback
    } finally {
      setSyncing(false);
    }
  }, [sheetsEnabled, offlineMode]);

  return (
    <StoreContext.Provider value={{ state, dispatch, loading, syncing, offlineMode }}>
      {children}
    </StoreContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
