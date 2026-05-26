"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { AppState, User, BillingPeriod, Report, Project } from "@/types";
import { supabase, isConfigured } from "./supabase";
import * as db from "./supabase-api";

// ── Fallback state ────────────────────────────────────────────────────────────

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
  clients: ["Zota AI", "Cliente Externo 1", "Cliente Externo 2"],
  projects: [
    { name: "Proyecto Alpha", clientName: "Zota AI" },
    { name: "Proyecto Beta",  clientName: "Zota AI" },
    { name: "Proyecto Gamma", clientName: "Cliente Externo 1" },
  ],
  expenseCategories: [],
};

const STORAGE_KEY = "zota-dashboard-v3";

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "HYDRATE";        payload: AppState }
  | { type: "ADD_PERIOD";     payload: BillingPeriod }
  | { type: "UPDATE_PERIOD";  payload: BillingPeriod }
  | { type: "DELETE_PERIOD";  payload: string }
  | { type: "ADD_USER";       payload: User }
  | { type: "UPDATE_USER";    payload: User }
  | { type: "DELETE_USER";    payload: string }
  | { type: "ADD_CLIENT";     payload: string }
  | { type: "DELETE_CLIENT";  payload: string }
  | { type: "ADD_PROJECT";    payload: Project }
  | { type: "DELETE_PROJECT"; payload: Project }
  | { type: "SAVE_DRAFT";     payload: Report }   // upsert draft (create or update)
  | { type: "SUBMIT_REPORT";  payload: string }   // reportId → change draft to submitted
  | { type: "DELETE_REPORT";  payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    case "ADD_PERIOD":
      return { ...state, periods: [...state.periods, action.payload] };
    case "UPDATE_PERIOD":
      return { ...state, periods: state.periods.map(p => p.id === action.payload.id ? action.payload : p) };
    case "DELETE_PERIOD":
      return { ...state, periods: state.periods.filter(p => p.id !== action.payload) };
    case "ADD_USER":
      return { ...state, users: [...state.users, action.payload] };
    case "UPDATE_USER":
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    case "DELETE_USER":
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };
    case "ADD_CLIENT":
      return { ...state, clients: [...state.clients, action.payload] };
    case "DELETE_CLIENT":
      // Also remove all projects belonging to this client
      return {
        ...state,
        clients: state.clients.filter(c => c !== action.payload),
        projects: state.projects.filter(p => p.clientName !== action.payload),
      };
    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.payload] };
    case "DELETE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter(
          p => !(p.name === action.payload.name && p.clientName === action.payload.clientName)
        ),
      };
    case "SAVE_DRAFT":
      return {
        ...state,
        reports: state.reports.some(r => r.id === action.payload.id)
          ? state.reports.map(r => r.id === action.payload.id ? action.payload : r)
          : [...state.reports, action.payload],
      };
    case "SUBMIT_REPORT":
      return {
        ...state,
        reports: state.reports.map(r =>
          r.id === action.payload
            ? { ...r, status: "submitted" as const, submittedAt: new Date().toISOString() }
            : r
        ),
      };
    case "DELETE_REPORT":
      return { ...state, reports: state.reports.filter(r => r.id !== action.payload) };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface StoreContextValue {
  state: AppState;
  dispatch: (action: Action) => void;
  loading: boolean;
  syncing: boolean;
  connected: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, localDispatch] = useReducer(reducer, INITIAL_STATE);
  const [loading,   setLoading]   = useState(true);
  const [syncing,   setSyncing]   = useState(false);
  const [connected, setConnected] = useState(false);

  const hydrate = useCallback(async () => {
    if (!isConfigured) return;
    try {
      const data = await db.fetchAllData();
      localDispatch({ type: "HYDRATE", payload: data });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setConnected(true);
    } catch (err) {
      console.error("[Supabase] fetch error:", err);
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    async function boot() {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try { localDispatch({ type: "HYDRATE", payload: JSON.parse(cached) }); } catch {}
      }
      await hydrate();
      setLoading(false);
    }
    boot();
  }, [hydrate]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isConfigured) return;

    const debouncedHydrate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => hydrate(), 300);
    };

    const channel = supabase
      .channel("zota-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" },      debouncedHydrate)
      .on("postgres_changes", { event: "*", schema: "public", table: "periods" },     debouncedHydrate)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" },     debouncedHydrate)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" },    debouncedHydrate)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" },     debouncedHydrate)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" },  debouncedHydrate)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" },           debouncedHydrate)
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_categories" }, debouncedHydrate)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [hydrate]);

  useEffect(() => {
    if (!loading && !isConfigured) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, loading]);

  const dispatch = useCallback(async (action: Action) => {
    localDispatch(action);
    if (!isConfigured) return;

    setSyncing(true);
    try {
      switch (action.type) {
        case "ADD_USER":       await db.addUser(action.payload);       break;
        case "UPDATE_USER":    await db.updateUser(action.payload);    break;
        case "DELETE_USER":    await db.deleteUser(action.payload);    break;
        case "ADD_PERIOD":     await db.addPeriod(action.payload);     break;
        case "UPDATE_PERIOD":  await db.updatePeriod(action.payload);  break;
        case "DELETE_PERIOD":  await db.deletePeriod(action.payload);  break;
        case "ADD_CLIENT":     await db.addClient(action.payload);     break;
        case "DELETE_CLIENT":  await db.deleteClient(action.payload);  break;
        case "ADD_PROJECT":    await db.addProject(action.payload);    break;
        case "DELETE_PROJECT": await db.deleteProject(action.payload); break;
        case "SAVE_DRAFT":     await db.saveDraft(action.payload);     break;
        case "SUBMIT_REPORT":  await db.submitReport(action.payload);  break;
        case "DELETE_REPORT":  await db.deleteReport(action.payload);  break;
      }
    } catch (err) {
      console.error("[Supabase] write error:", err);
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch, loading, syncing, connected }}>
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
