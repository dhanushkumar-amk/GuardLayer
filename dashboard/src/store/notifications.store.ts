import { create } from 'zustand';

interface NotificationsState {
  hasNewThreat: boolean;
  setHasNewThreat: (hasNew: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  hasNewThreat: false,
  setHasNewThreat: (hasNew) => set({ hasNewThreat: hasNew }),
}));

export default useNotificationsStore;
