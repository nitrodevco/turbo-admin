import { create } from 'zustand';

interface DrawerState {
    open: boolean;
    setOpen: (open: boolean) => void;
}

/** Whether the navigation is open on a phone: a drawer from the left, opened from the page header's menu button. */
export const useDrawer = create<DrawerState>(set => ({
    open: false,
    setOpen: open => set({ open }),
}));
