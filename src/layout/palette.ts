import { create } from 'zustand';

interface PaletteState {
    open: boolean;
    setOpen: (open: boolean) => void;
}

/** Whether the search (Ctrl K) is open: from the shortcut, or the search button in a page's header. */
export const usePalette = create<PaletteState>(set => ({
    open: false,
    setOpen: open => set({ open }),
}));

/** Whether the shortcuts sheet is open: from `?`, or the sidebar's keyboard button. */
export const useShortcutsSheet = create<PaletteState>(set => ({
    open: false,
    setOpen: open => set({ open }),
}));
