import { create } from "zustand";

type ConnectionStatus = "online" | "degraded" | "offline";

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
  isWhatIfEnabled: () => boolean;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: "online",
  setStatus: (status) => set({ status }),
  isWhatIfEnabled: () => get().status === "online",
  reset: () => set({ status: "online" }),
}));
