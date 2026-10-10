import { create } from 'zustand';

/** Whether the hotel's controls are open: the sheet any page can open, from the status or a button. */
export const useHotelSheet = create<{ open: boolean; setOpen: (open: boolean) => void }>(set => ({
    open: false,
    setOpen: open => set({ open }),
}));
