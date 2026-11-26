import { create } from 'zustand';

interface MoreSheetState {
    open: boolean;
    setOpen: (open: boolean) => void;
}

/** Whether a phone's More sheet is open: every place, the search and your account, from the tab bar's More. */
export const useMoreSheet = create<MoreSheetState>(set => ({
    open: false,
    setOpen: open => set({ open }),
}));
