import { create } from 'zustand';

interface DrawerState {
    open: boolean;
    setOpen: (open: boolean) => void;
}

/** Whether the sidebar is open: on a phone it is a drawer, opened from the page header's menu button. */
export const useDrawer = create<DrawerState>(set => ({
    open: false,
    setOpen: open => set({ open }),
}));
