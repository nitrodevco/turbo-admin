import { useQueryClient } from '@tanstack/react-query';
import { Keyboard, LogOut, Monitor, Moon, Sun, UserRound, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';

import { post } from '#/api/client';
import { useLiveUpdates } from '#/api/live';
import { useSession } from '#/auth/session';
import { Segmented } from '#/components/ui';
import { cx } from '#/lib/cx';
import { setTheme, type ThemeChoice, useTheme } from '#/lib/theme';

import { CommandPalette } from './CommandPalette';
import { useDrawer } from './drawer';
import { useNav } from './nav';
import { useShortcutsSheet } from './palette';
import { Shortcuts } from './Shortcuts';

const THEMES: { value: ThemeChoice; label: string; icon: ReactNode }[] = [
    { value: 'dark', label: 'Dark', icon: <Moon /> },
    { value: 'light', label: 'Light', icon: <Sun /> },
    { value: 'system', label: 'System', icon: <Monitor /> },
];

const useSignOut = () => {
    const signOut = useSession(state => state.signOut);
    const queryClient = useQueryClient();

    return async () => {
        // Ending the session on the server matters more than its answer: sign out here either way.
        await post('/auth/logout').catch(() => undefined);
        queryClient.clear();
        signOut();
    };
};

const sideLink = ({ isActive }: { isActive: boolean }) => cx(
    'relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors [&>svg]:size-[18px] [&>svg]:shrink-0',
    isActive
        ? 'bg-subtle text-ink before:absolute before:inset-y-2.5 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-accent [&>svg]:text-accent'
        : 'text-muted hover:bg-subtle hover:text-ink',
);

/** The small square buttons at the sidebar's foot: the theme, signing out. */
const footButton = 'grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink [&>svg]:size-[18px]';

/** Dark, light or as the system is: the chosen one's icon at the sidebar's foot, the three above it when opened. */
const RailTheme = () => {
    const choice = useTheme();
    const [ open, setOpen ] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const current = THEMES.find(entry => entry.value === choice) ?? THEMES[0]!;

    useEffect(() => {
        if (!open)
            return;

        const away = (event: MouseEvent) => {
            if (!box.current?.contains(event.target as Node))
                setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape')
                setOpen(false);
        };

        document.addEventListener('mousedown', away);
        window.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', away);
            window.removeEventListener('keydown', onKey);
        };
    }, [ open ]);

    return (
        <div ref={box} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                title={`Theme: ${current.label.toLowerCase()}`}
                aria-label="Theme"
                aria-expanded={open}
                className={footButton}
            >
                {current.icon}
            </button>
            {open && (
                <div role="radiogroup" aria-label="Theme options" className="absolute right-0 bottom-full z-40 mb-2 flex gap-1 rounded-lg border border-line bg-surface p-1 shadow-xl">
                    {THEMES.map(entry => (
                        <button
                            key={entry.value}
                            type="button"
                            role="radio"
                            aria-checked={entry.value === choice}
                            title={entry.label}
                            aria-label={entry.label}
                            onClick={() => {
                                setTheme(entry.value);
                                setOpen(false);
                            }}
                            className={cx('grid size-9 place-items-center rounded-md [&>svg]:size-4', entry.value === choice ? 'bg-subtle text-accent' : 'text-muted hover:text-ink')}
                        >
                            {entry.icon}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/** From a laptop up: the pages by name down the left, and at its foot your account, the shortcuts, the theme and signing out. */
const Rail = () => {
    const nav = useNav();
    const player = useSession(state => state.session?.player);
    const signOut = useSignOut();
    const showShortcuts = useShortcutsSheet(state => state.setOpen);

    return (
        <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-chrome lg:flex">
            <Link to="/" className="flex h-17 shrink-0 items-center gap-3 px-4">
                <span className="grid size-8 place-items-center rounded-lg bg-accent font-mono text-sm font-bold text-on-accent">T</span>
                <span className="font-mono text-xs font-medium tracking-[0.08em] text-ink uppercase">Turbo Admin</span>
            </Link>
            <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
                {nav.map(item => (
                    <NavLink key={item.to} to={item.to} end={item.end} className={sideLink}>
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}
            </div>
            <div className="flex items-center gap-1 border-t border-line px-3 py-3">
                <NavLink
                    to="/account"
                    title="Your account"
                    className={({ isActive }) => cx('flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-[13px] transition-colors', isActive ? 'bg-subtle text-ink' : 'text-muted hover:bg-subtle hover:text-ink')}
                >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-warn font-mono text-[10px] font-semibold text-[#0a0e13]">{player?.name.slice(0, 2).toUpperCase()}</span>
                    <span className="truncate">{player?.name}</span>
                </NavLink>
                <button type="button" onClick={() => showShortcuts(true)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" className={footButton}>
                    <Keyboard />
                </button>
                <RailTheme />
                <button type="button" onClick={signOut} title="Sign out" aria-label="Sign out" className={cx(footButton, 'hover:text-bad')}>
                    <LogOut />
                </button>
            </div>
        </nav>
    );
};

const drawerLink = ({ isActive }: { isActive: boolean }) => cx(
    'relative flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors [&>svg]:size-5 [&>svg]:shrink-0',
    isActive
        ? 'bg-subtle text-ink before:absolute before:inset-y-3 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-accent [&>svg]:text-accent'
        : 'text-muted hover:bg-subtle hover:text-ink',
);

/**
 * On a phone and a tablet: the navigation as a drawer from the left, opened from the menu button
 * in the page header. Every page by name, then your account, the theme and signing out. It closes
 * when a page is picked, on a tap outside it, and on Escape; while closed, nothing in it can be
 * tabbed to.
 */
const Drawer = () => {
    const nav = useNav();
    const choice = useTheme();
    const signOut = useSignOut();
    const player = useSession(state => state.session?.player);
    const open = useDrawer(state => state.open);
    const setOpen = useDrawer(state => state.setOpen);
    const close = () => setOpen(false);

    useEffect(() => {
        if (!open)
            return;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape')
                setOpen(false);
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [ open, setOpen ]);

    return (
        <div className="lg:hidden">
            <div
                aria-hidden
                onClick={close}
                className={cx('fixed inset-0 z-40 bg-[rgb(5_8_12/0.6)] transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
            />
            <aside
                aria-label="Main"
                inert={!open}
                className={cx(
                    'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-line bg-chrome shadow-2xl transition-transform duration-200',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex items-center gap-3 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-4">
                    <span className="grid size-10 place-items-center rounded-lg bg-accent font-mono text-base font-bold text-on-accent">T</span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">Turbo Admin</span>
                        {player && <span className="block truncate font-mono text-[11px] text-muted">{player.name}</span>}
                    </span>
                    <button type="button" onClick={close} aria-label="Close menu" className="grid size-11 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink [&>svg]:size-5">
                        <X />
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto px-3">
                    {nav.map(item => (
                        <NavLink key={item.to} to={item.to} end={item.end} onClick={close} className={drawerLink}>
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="flex flex-col gap-1 border-t border-line px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                    <NavLink to="/account" onClick={close} className={drawerLink}>
                        <UserRound />
                        Your account
                    </NavLink>
                    <div className="px-1 py-2">
                        <Segmented label="Theme" value={choice} onChange={value => setTheme(value as ThemeChoice)} options={THEMES.map(x => ({ value: x.value, label: x.label }))} />
                    </div>
                    <button type="button" onClick={signOut} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] text-bad hover:bg-subtle [&>svg]:size-5">
                        <LogOut />
                        Sign out
                    </button>
                </div>
            </aside>
        </div>
    );
};

/** The frame every signed-in page sits in, and the live stream that keeps them current. */
export const Shell = () => {
    useLiveUpdates();

    return (
        <div className="flex min-h-dvh">
            <Rail />
            <Drawer />
            <CommandPalette />
            <Shortcuts />
            <div className="flex min-w-0 flex-1 flex-col">
                <main className="flex min-w-0 flex-1 flex-col pb-8 lg:pb-10">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
