import { create } from 'zustand';

interface DrawerState {
    open: boolean;
    setOpen: (open: boolean) => void;
}

/** Whether the menu is open on a phone or a tablet: a sheet from the bottom, opened from the bottom bar. */
export const useDrawer = create<DrawerState>(set => ({
    open: false,
    setOpen: open => set({ open }),
}));
