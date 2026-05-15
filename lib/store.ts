"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import type { AppState, User, BillingPeriod, Report } from "@/types";

const INITIAL_STATE: AppState = {
  users: [
    { id: "1", name: "Juan García" },
    { id: "2", name: "María López" },
    { id: "3", name: "Carlos Rodríguez" },
  ],
  periods: [
    {
      id: "1",
      name: "1ra Quincena Mayo 2026",
      startDate: "2026-05-01",
      endDate: "2026-05-15",
    },
    {
      id: "2",
      name: "2da Quincena Mayo 2026",
      startDate: "2026-05-16",
      endDate: "2026-05-31",
    },
    {
      id: "3",
      name: "1ra Quincena Junio 2026",
      startDate: "2026-06-01",
      endDate: "2026-06-15",
    },
  ],
  reports: [],
  areas: [
    "Proyectos",
    "Administración",
    "Marketing",
    "Contabilidad",
    "Comercial / Ventas",
    "I+D",
  ],
};

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
    case "HYDRATE":
      return action.payload;
    case "ADD_PERIOD":
      return { ...state, periods: [...state.periods, action.payload] };
    case "UPDATE_PERIOD":
      return {
        ...state,
        periods: state.periods.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PERIOD":
      return {
        ...state,
        periods: state.periods.filter((p) => p.id !== action.payload),
      };
    case "ADD_USER":
      return { ...state, users: [...state.users, action.payload] };
    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload.id ? action.payload : u
        ),
      };
    case "DELETE_USER":
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.payload),
      };
    case "ADD_AREA":
      return { ...state, areas: [...state.areas, action.payload] };
    case "DELETE_AREA":
      return {
        ...state,
        areas: state.areas.filter((a) => a !== action.payload),
      };
    case "SUBMIT_REPORT":
      return { ...state, reports: [...state.reports, action.payload] };
    case "DELETE_REPORT":
      return {
        ...state,
        reports: state.reports.filter((r) => r.id !== action.payload),
      };
    default:
      return state;
  }
}

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_KEY = "zota-dashboard-v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        dispatch({ type: "HYDRATE", payload: parsed });
      }
    } catch {
      // Corrupted storage — start fresh
    }
  }, []);

  // Persist every state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
