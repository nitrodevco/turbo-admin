import { LayoutGrid, LogOut, Search, X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router';

import { useApprovalCount } from '#/api/approvals';
import { useSession } from '#/auth/session';
import { useModalDialog } from '#/components/dialog';
import { Label } from '#/components/ui';
import { cx } from '#/lib/cx';
import { setTheme, useTheme } from '#/lib/theme';

import { THEMES, useSignOut } from './account';
import { HotelStatusCard } from './HotelStatus';
import { Initials } from './Initials';
import { useMoreSheet } from './moreSheet';
import { type ShownEntry, useIsActive, useNav } from './nav';
import { usePalette } from './palette';

/**
 * The places a phone's tab bar holds, the first four of these the viewer may open: what staff
 * reach for on a phone (who is on, what is going on in a room, what players reported). Any other
 * place is a tap on More away.
 */
const TAB_BAR = [ 'Overview', 'Players', 'Rooms', 'Moderation', 'Catalog', 'Logs', 'Console' ];

const TAB_COUNT = 4;

/** The tab bar's places, by `TAB_BAR`'s order, from the entries the viewer may open. */
const useTabEntries = () => {
    const entries = useNav().flatMap(section => section.entries);

    return TAB_BAR.map(label => entries.find(entry => entry.label === label)).filter(entry => entry !== undefined).slice(0, TAB_COUNT);
};

const tabClass = (active: boolean) => cx(
    'flex min-w-0 flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors',
    active ? 'text-ink' : 'text-muted active:text-ink',
);

/** A tab's icon, on a pill tinted with the accent when it is the page open now, so the place reads at a glance. */
const TabIcon = ({ active, children, dot }: { active: boolean; children: ReactNode; dot?: boolean }) => (
    <span className={cx('relative grid h-7 w-14 place-items-center rounded-full transition-colors [&>svg]:size-5', active && 'bg-accent-soft text-accent')}>
        {children}
        {dot && <span aria-hidden className="absolute top-0.5 right-3.5 size-2 rounded-full bg-accent-solid ring-2 ring-chrome" />}
    </span>
);

/**
 * Along a phone's and a tablet's bottom edge, under the thumb: the places used most, and More for
 * the rest (the whole menu in a sheet). More shows a dot while approvals wait that no tab shows.
 */
export const TabBar = () => {
    const tabs = useTabEntries();
    const isActive = useIsActive();
    const more = useMoreSheet(state => state.open);
    const setMore = useMoreSheet(state => state.setOpen);
    const approvalsWaiting = (useApprovalCount().data?.pending ?? 0) > 0;
    const elsewhere = !tabs.some(isActive);

    return (
        <nav aria-label="Main" className="relative z-30 shrink-0 border-t border-line bg-chrome/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
            <div className="mx-auto grid h-(--tabbar-height) max-w-xl" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
                {tabs.map((entry) => {
                    const active = isActive(entry) && !more;

                    return (
                        <Link key={entry.label} to={entry.to} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
                            <TabIcon active={active}>{entry.icon}</TabIcon>
                            <span className="max-w-full truncate px-1">{entry.label}</span>
                        </Link>
                    );
                })}
                <button
                    type="button"
                    onClick={() => setMore(!more)}
                    aria-expanded={more}
                    aria-label={approvalsWaiting ? 'More, approvals waiting' : 'More'}
                    className={tabClass(more || elsewhere)}
                >
                    <TabIcon active={more || elsewhere} dot={approvalsWaiting}><LayoutGrid /></TabIcon>
                    More
                </button>
            </div>
        </nav>
    );
};

/** One place in the More sheet: its icon and name, a tile a thumb can hit, edged in the accent when it is the page open now. */
const MoreTile = ({ entry, active, onPick }: { entry: ShownEntry; active: boolean; onPick: () => void }) => {
    const pending = useApprovalCount().data?.pending ?? 0;

    return (
        <Link
            to={entry.to}
            onClick={onPick}
            aria-current={active ? 'page' : undefined}
            className={cx(
                'flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors [&>svg]:size-[18px] [&>svg]:shrink-0',
                active ? 'border-accent-edge bg-accent-soft text-ink [&>svg]:text-accent' : 'border-line bg-surface text-ink active:bg-subtle [&>svg]:text-muted',
            )}
        >
            {entry.icon}
            <span className="min-w-0 flex-1 leading-tight">{entry.label}</span>
            {entry.counter === 'approvals' && pending > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent-solid px-1 text-2xs font-semibold text-on-accent tabular-nums" aria-label={`${pending} waiting`}>{pending > 99 ? '99+' : pending}</span>
            )}
        </Link>
    );
};

/**
 * Every place, on a phone: a sheet risen from the tab bar's More with the search at its top, the
 * hotel's state (its controls a tap away), the places in their sections, and your account, the
 * theme and signing out at its foot. It closes on a place picked, on a tap outside it, on Escape
 * and when the page changes.
 */
export const MoreSheet = () => {
    const open = useMoreSheet(state => state.open);
    const setOpen = useMoreSheet(state => state.setOpen);
    const close = () => setOpen(false);
    const dialog = useModalDialog(open, close);
    const { ref } = dialog;
    const sections = useNav();
    const isActive = useIsActive();
    const openSearch = usePalette(state => state.setOpen);
    const name = useSession(state => state.session?.player.name);
    const theme = useTheme();
    const signOut = useSignOut();

    // Opened, the sheet holds the focus itself: given to its first link, Safari on a phone rings it after a tap.
    useEffect(() => {
        if (open)
            ref.current?.focus();
    }, [ open, ref ]);

    return (
        <dialog
            {...dialog}
            aria-label="Menu"
            tabIndex={-1}
            className="mx-0 mt-auto mb-0 max-h-[92dvh] w-full max-w-none animate-sheet overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-line bg-chrome p-0 text-ink shadow-overlay outline-none sm:mx-auto sm:max-w-xl lg:hidden"
        >
            {open && (
                <nav aria-label="Every place" className="flex flex-col gap-5 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-line" />
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                close();
                                openSearch(true);
                            }}
                            className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-left text-base text-muted"
                        >
                            <Search className="size-[18px] shrink-0" />
                            Search players, rooms, pages
                        </button>
                        <button type="button" onClick={close} aria-label="Close" className="grid size-11 shrink-0 place-items-center rounded-xl text-muted active:bg-subtle">
                            <X className="size-5" />
                        </button>
                    </div>
                    <div className="-mx-3 flex flex-col">
                        <HotelStatusCard />
                    </div>
                    {sections.map(section => (
                        <section key={section.label ?? 'top'} className="flex flex-col gap-2">
                            {section.label && <Label as="h3">{section.label}</Label>}
                            <div className="grid grid-cols-2 gap-2">
                                {section.entries.map(entry => <MoreTile key={entry.label} entry={entry} active={isActive(entry)} onPick={close} />)}
                            </div>
                        </section>
                    ))}
                    <section className="flex flex-col gap-2 border-t border-line pt-4">
                        <Link to="/account" onClick={close} className="flex min-h-12 items-center gap-3 rounded-xl px-1 active:bg-subtle">
                            <Initials className="size-9 text-xs" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{name}</span>
                                <span className="block text-xs text-muted">Your account and passkeys</span>
                            </span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <div role="radiogroup" aria-label="Theme" className="flex flex-1 gap-1 rounded-xl bg-canvas p-1">
                                {THEMES.map(entry => (
                                    <button
                                        key={entry.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={entry.value === theme}
                                        onClick={() => setTheme(entry.value)}
                                        className={cx(
                                            'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium [&>svg]:size-4',
                                            entry.value === theme ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]' : 'text-muted',
                                        )}
                                    >
                                        {entry.icon}
                                        {entry.label}
                                    </button>
                                ))}
                            </div>
                            <button type="button" onClick={signOut} className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-bad active:bg-bad-soft [&>svg]:size-4">
                                <LogOut />
                                Sign out
                            </button>
                        </div>
                    </section>
                </nav>
            )}
        </dialog>
    );
};
