/**
 * Dark, light, or whatever the system says: the viewer's choice, kept in this browser, and the
 * `dark` class on `<html>` the stylesheet's dark tokens hang off. The panel is dark until someone
 * chooses otherwise. It is applied before the first render (`startTheme`, from `main.tsx`) so a page
 * never flashes, and follows the system while the choice is `system`.
 */
import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

const KEY = 'turbo-admin-theme';
const listeners = new Set<() => void>();
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const readChoice = (): ThemeChoice => {
    try {
        const saved = localStorage.getItem(KEY);

        return saved === 'light' || saved === 'system' ? saved : 'dark';
    } catch {
        return 'dark';
    }
};

let choice: ThemeChoice = 'dark';

const apply = () => {
    document.documentElement.classList.toggle('dark', choice === 'dark' || (choice === 'system' && systemDark()));

    for (const listener of listeners)
        listener();
};

/** Reads the saved choice, applies it, and follows the system and other tabs from then on. */
export const startTheme = () => {
    choice = readChoice();
    apply();

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (choice === 'system')
            apply();
    });
    window.addEventListener('storage', (event) => {
        if (event.key !== KEY)
            return;

        choice = readChoice();
        apply();
    });
};

export const setTheme = (next: ThemeChoice) => {
    choice = next;

    try {
        if (next === 'dark')
            localStorage.removeItem(KEY);
        else
            localStorage.setItem(KEY, next);
    } catch {
        // No storage: this page keeps the choice until it is reloaded.
    }

    apply();
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

export const useTheme = () => useSyncExternalStore(subscribe, () => choice);
