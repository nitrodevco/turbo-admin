import { useQueryClient } from '@tanstack/react-query';
import { Gauge, House, KeyRound, LogOut, Monitor, Moon, ShieldCheck, SquareTerminal, Sun, UserRound, X, Zap } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';

import { post } from '#/api/client';
import { useMe } from '#/api/queries';
import { useSession } from '#/auth/session';
import { cx } from '#/lib/cx';
import { setTheme, type ThemeChoice, useTheme } from '#/lib/theme';

import { useDrawer } from './drawer';

const NAV = [
    { to: '/', label: 'Dashboard', icon: <Gauge />, end: true },
    { to: '/rooms', label: 'Rooms', icon: <House />, end: false, needs: 'canViewRooms' },
    { to: '/console', label: 'Console', icon: <SquareTerminal />, end: false },
    { to: '/permissions', label: 'Permissions', icon: <KeyRound />, end: false, needs: 'canViewPermissions' },
    { to: '/staff', label: 'Staff', icon: <ShieldCheck />, end: false, needs: 'canResetPasskeys' },
] as const;

const navRow = 'group relative flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition';
const navRowActive = 'bg-zinc-800 text-white before:absolute before:inset-y-1.5 before:-left-3 before:w-1 before:rounded-r-full before:bg-indigo-400 [&>svg]:text-indigo-300';
const navRowIdle = 'hover:bg-zinc-800/60 hover:text-white hover:[&>svg]:-rotate-6 hover:[&>svg]:scale-110';

const footerButton = 'grid size-7 place-items-center rounded-md bg-zinc-800 text-zinc-400 transition hover:text-white [&>svg]:size-3.5';

const THEMES: { value: ThemeChoice; label: string; icon: ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun /> },
    { value: 'dark', label: 'Dark', icon: <Moon /> },
    { value: 'system', label: 'As the system is', icon: <Monitor /> },
];

/** Light, dark or as the system is: the chosen one's icon, which opens to all three above it. */
const ThemeSwitch = () => {
    const choice = useTheme();
    const [ open, setOpen ] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const current = THEMES.find(entry => entry.value === choice) ?? THEMES[2]!;

    // Open, it closes on Escape or a click anywhere else.
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
        <div ref={box} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title={`Theme: ${current.label.toLowerCase()}`}
                aria-label="Theme"
                aria-expanded={open}
                className={cx(footerButton, open && 'text-white')}
            >
                {current.icon}
            </button>
            {open && (
                // Its bottom padding bridges the gap to the icon, so crossing it does not close it.
                <div className="absolute right-0 bottom-full z-20 pb-1.5">
                    <div role="radiogroup" aria-label="Theme options" className="flex items-center rounded-md bg-zinc-800 p-0.5 shadow-lg ring-1 ring-zinc-700">
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
                                className={cx(
                                    'grid size-7 place-items-center rounded transition [&>svg]:size-3.5',
                                    entry.value === choice ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white',
                                )}
                            >
                                {entry.icon}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Sidebar = () => {
    const player = useSession(state => state.session?.player);
    const signOut = useSession(state => state.signOut);
    const { data: me } = useMe();
    const queryClient = useQueryClient();
    const open = useDrawer(state => state.open);
    const setOpen = useDrawer(state => state.setOpen);
    const { pathname } = useLocation();

    // On a phone the drawer closes once a page is picked, and on Escape.
    useEffect(() => {
        setOpen(false);
    }, [ pathname, setOpen ]);

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

    const handleSignOut = async () => {
        // Ending the session on the server matters more than its answer: sign out here either way.
        await post('/auth/logout').catch(() => undefined);
        queryClient.clear();
        signOut();
    };

    return (
        <>
            {open && <div aria-hidden className="fixed inset-0 z-40 bg-zinc-950/50 lg:hidden" onClick={() => setOpen(false)} />}
            <aside
                className={cx(
                    'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col bg-zinc-900 text-zinc-300 shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-60 lg:translate-x-0 lg:self-start lg:shadow-none dark:bg-[#131316]',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex items-center justify-between gap-2 px-5 py-5">
                    <NavLink to="/" className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-lg bg-indigo-500 text-white shadow-sm [&>svg]:size-4">
                            <Zap />
                        </span>
                        <span className="leading-tight">
                            <span className="block text-sm font-semibold text-white">Turbo</span>
                            <span className="block text-xs text-zinc-400">Admin</span>
                        </span>
                    </NavLink>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Close menu"
                        className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden [&>svg]:size-4"
                    >
                        <X />
                    </button>
                </div>
                <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
                    {NAV.filter(item => !('needs' in item) || me?.[item.needs]).map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => cx(navRow, isActive ? navRowActive : navRowIdle)}
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="flex items-center gap-2 border-t border-zinc-800 px-4 py-3">
                    <NavLink
                        to="/account"
                        title={`${player?.name ?? ''}: your account`}
                        className={({ isActive }) => cx('flex min-w-0 flex-1 items-center gap-2 text-xs [&>svg]:size-3.5 [&>svg]:shrink-0', isActive ? 'text-white' : 'hover:text-white')}
                    >
                        <UserRound />
                        <span className="truncate">{player?.name}</span>
                    </NavLink>
                    <ThemeSwitch />
                    <button type="button" onClick={handleSignOut} title="Sign out" aria-label="Sign out" className={footerButton}>
                        <LogOut />
                    </button>
                </div>
            </aside>
        </>
    );
};

/** The frame every signed-in page sits in: the sidebar, and the page with its own header. */
export const Shell = () => (
    <div className="flex min-h-dvh">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
            <Outlet />
        </main>
    </div>
);
