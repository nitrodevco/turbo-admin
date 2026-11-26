import { Keyboard, LogOut } from 'lucide-react';
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';

import { useApprovalCount } from '#/api/approvals';
import { useLiveUpdates } from '#/api/live';
import { useSession } from '#/auth/session';
import { ConfirmHost } from '#/components/ConfirmHost';
import { Logo } from '#/components/Logo';
import { PageErrorBoundary } from '#/components/PageErrorBoundary';
import { Toasts } from '#/components/Toasts';
import { Label } from '#/components/ui';
import { cx } from '#/lib/cx';
import { setTheme, useTheme } from '#/lib/theme';

import { THEMES, useSignOut } from './account';
import { CommandPalette, SearchButton } from './CommandPalette';
import { HotelSheet, HotelStatusCard } from './HotelStatus';
import { Initials } from './Initials';
import { useMoreSheet } from './moreSheet';
import { type ShownEntry, useIsActive, useNav } from './nav';
import { NotificationsBell } from './NotificationsBell';
import { useShortcutsSheet } from './palette';
import { MoreSheet, TabBar } from './PhoneNav';
import { PreviewBanner } from './PreviewBanner';
import { Shortcuts } from './Shortcuts';

/** The small square buttons at the sidebar's foot: the shortcuts, the theme, signing out. */
const footButton = 'grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink [&>svg]:size-[18px]';

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
                <div role="radiogroup" aria-label="Theme options" className="absolute right-0 bottom-full z-40 mb-2 flex gap-1 rounded-lg border border-line bg-surface p-1 shadow-pop">
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
                            className={cx('grid size-8 place-items-center rounded-md [&>svg]:size-4', entry.value === choice ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink')}
                        >
                            {entry.icon}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/** One entry of the sidebar: its icon and name, on a bar tinted with the accent, an edge of it at the left, when it is the page open now. */
const RailLink = ({ entry, active }: { entry: ShownEntry; active: boolean }) => (
    <Link
        to={entry.to}
        title={entry.hint}
        aria-current={active ? 'page' : undefined}
        className={cx(
            'relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors [&>svg]:size-[18px] [&>svg]:shrink-0',
            active
                ? 'bg-accent-soft font-medium text-ink before:absolute before:inset-y-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-accent-solid [&>svg]:text-accent'
                : 'text-muted hover:bg-subtle hover:text-ink',
        )}
    >
        {entry.icon}
        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
        {entry.counter === 'approvals' && <ApprovalCount />}
    </Link>
);

/** How many approvals wait for a decision, by the menu's Approvals; nothing when none do. */
const ApprovalCount = () => {
    const pending = useApprovalCount().data?.pending ?? 0;

    return pending > 0
        ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent-solid px-1 text-2xs leading-none font-semibold text-on-accent tabular-nums" aria-label={`${pending} waiting`}>{pending > 99 ? '99+' : pending}</span>
        : null;
};

/**
 * From a laptop up, down the window's left: the logo, the search and the bell under it, the
 * hotel's state, then the places in their sections (pages alike share one entry and show as tabs
 * on their pages), and at its foot your account, the shortcuts, the theme and signing out. A phone
 * has the same places in its tab bar and More sheet (`PhoneNav`).
 */
const Rail = () => {
    const sections = useNav();
    const isActive = useIsActive();
    const player = useSession(state => state.session?.player);
    const signOut = useSignOut();
    const showShortcuts = useShortcutsSheet(state => state.setOpen);

    return (
        <nav aria-label="Main" className="sticky top-0 z-30 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-chrome lg:flex">
            {/* Ringed inside its edges: it spans the sidebar, whose edges would cut a ring outside them to a line. */}
            <Link to="/" aria-label="Turbo Admin, overview" className="flex h-16 shrink-0 items-center rounded-lg px-4 focus-visible:-outline-offset-2">
                <Logo />
            </Link>
            <div className="flex shrink-0 items-center gap-1.5 px-3 pb-3">
                <SearchButton />
                <NotificationsBell align="start" />
            </div>
            <HotelStatusCard />
            <div className="no-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto px-3 pt-5 pb-3">
                {sections.map(section => (
                    <div key={section.label ?? 'top'} className="flex flex-col gap-0.5">
                        {section.label && <Label as="h3" className="px-3 pb-1.5">{section.label}</Label>}
                        {section.entries.map(entry => <RailLink key={entry.label} entry={entry} active={isActive(entry)} />)}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-0.5 border-t border-line px-3 py-3">
                <NavLink
                    to="/account"
                    title="Your account"
                    className={({ isActive: open }) => cx('flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 text-ui transition-colors', open ? 'bg-subtle text-ink' : 'text-muted hover:bg-subtle hover:text-ink')}
                >
                    <Initials className="size-6 text-2xs" />
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

/** A new page starts at its top, with the More sheet closed; tabs kept in the address (its search) keep the place. */
const useFreshPage = (root: RefObject<HTMLElement | null>) => {
    const { pathname } = useLocation();
    const setMore = useMoreSheet(state => state.setOpen);

    useLayoutEffect(() => {
        root.current?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
        setMore(false);
    }, [ pathname, root, setMore ]);
};

/**
 * Pages whose unsaved work spans their own paths: the notices (drafts of several notices, a new one
 * opening at its key) and the hotel view (one change set across its tabs).
 */
const WORKSPACES = [ '/notices', '/hotel-view' ];

/**
 * What a page is drawn again from nothing on: its path, so another room, player or plugin page
 * starts from its own data, but one key for each workspace's paths, so moving within it keeps its work.
 */
const pageKeyOf = (pathname: string) => WORKSPACES.find(x => pathname === x || pathname.startsWith(`${x}/`)) ?? pathname;

/**
 * The frame every signed-in page sits in, and the live stream that keeps them current. From a
 * laptop up the window scrolls beside the sidebar; on a phone and a tablet the page scrolls between
 * its header and the tab bar along the bottom, whose More opens every other place.
 */
export const Shell = () => {
    useLiveUpdates();
    const main = useRef<HTMLElement>(null);
    const { pathname } = useLocation();

    useFreshPage(main);

    return (
        <div className="flex min-h-dvh max-lg:h-dvh max-lg:flex-col max-lg:overflow-hidden">
            <Rail />
            <CommandPalette />
            <Shortcuts />
            <MoreSheet />
            <HotelSheet />
            <ConfirmHost />
            <Toasts />
            <main ref={main} data-scroll-root className="flex min-h-0 min-w-0 flex-1 flex-col max-lg:overflow-y-auto max-lg:overscroll-contain lg:pb-[env(safe-area-inset-bottom)]">
                <PreviewBanner />
                <PageErrorBoundary key={pageKeyOf(pathname)} resetKey={pathname}>
                    <Outlet />
                </PageErrorBoundary>
            </main>
            <TabBar />
        </div>
    );
};
