import { ChevronRight, Cpu, CupSoda, PlugZap, SlidersHorizontal } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router';

import { useCommandLog } from '#/api/commandLog';
import { useFurnitureList } from '#/api/gamedata';
import { useLive } from '#/api/live';
import { type Plugin, usePlugins, useReloadPlugin } from '#/api/plugins';
import { useDashboard, useHotelAbilities, useMe } from '#/api/queries';
import type { AvailabilityPhase, DashboardResponse } from '#/api/types';
import { Ago, Badge, Button, EmptyState, ErrorNotice, LiveBadge, Loading, PageBody, PageHeader, Panel, TextLink } from '#/components/ui';
import { phaseOf } from '#/layout/availability';
import { useHotelSheet } from '#/layout/hotelSheet';
import { useHubTabs } from '#/layout/nav';
import { cx } from '#/lib/cx';
import { plural } from '#/lib/plural';
import { formatClock, formatDateTime } from '#/lib/time';

import { Outcome } from './CommandLogPage';
import { HotelControls } from './HotelControls';

const TONES = { good: 'green', warn: 'amber', bad: 'red' } as const;

const formatUptime = (startedAtUtc: string, now: number) => {
    const minutes = Math.max(0, Math.floor((now - new Date(startedAtUtc).getTime()) / 60_000));
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);

    return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes % 60}m`;
};

/** The time now, moved on every minute, so a figure counted from it (the uptime) keeps up without a refresh. */
const useMinuteClock = () => {
    const [ now, setNow ] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);

        return () => window.clearInterval(timer);
    }, []);

    return now;
};

const AvailabilityBadge = ({ phase, atUtc }: { phase: AvailabilityPhase; atUtc: string | null }) => {
    const known = phaseOf(phase);

    return (
        <Badge tone={TONES[known.tone]}>
            <span className="size-1.5 rounded-full bg-current" />
            {known.label}
            {atUtc && <span className="font-normal">at {formatClock(atUtc)}</span>}
        </Badge>
    );
};

/** Whether the viewer may do anything to the hotel: send an alert, start maintenance or a shutdown, or set the welcome message. */
const useCanControlHotel = () => {
    const { data: can } = useHotelAbilities();

    return !!can && (can.alert || can.maintenance || can.shutdown || can.welcomeMessage);
};

/** A server fact under the hotel's figures: what it is, and its value, with a line more on hover. */
const Fact = ({ label, value, title }: { label: string; value: string; title?: string }) => (
    <div className="min-w-0" title={title}>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="truncate text-sm font-medium tabular-nums">{value}</dd>
    </div>
);

/**
 * The top of the overview, the hotel as the desk sees it: whether it lets players in, how many are
 * on and in how many rooms, lettered large, and under them how the server holds up. Below a
 * laptop's width, where the controls are not beside the rooms, it has the button to their sheet.
 */
const HotelDesk = ({ data, now, canControl }: { data: DashboardResponse; now: number; canControl: boolean }) => {
    const openHotel = useHotelSheet(state => state.setOpen);
    const phase = phaseOf(data.availability);

    return (
        <section aria-label="The hotel now" className="card overflow-clip">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 pt-4 sm:px-5 sm:pt-5">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <AvailabilityBadge phase={data.availability} atUtc={data.availabilityAtUtc} />
                    {phase.tone === 'good' && <span className="text-muted max-sm:hidden">Players can log in</span>}
                </div>
                {canControl && (
                    <Button variant="secondary" icon={<SlidersHorizontal />} onClick={() => openHotel(true)} className="lg:hidden">
                        Hotel controls
                    </Button>
                )}
            </div>
            <p className="flex flex-wrap items-baseline gap-x-3 px-4 pt-4 pb-5 sm:px-5">
                <span className="font-display text-5xl leading-none tabular-nums sm:text-6xl">{data.playersOnline.toLocaleString()}</span>
                <span className="text-lg leading-tight font-medium text-muted sm:text-xl">
                    {data.playersOnline === 1 ? 'player' : 'players'} on, in {plural(data.roomsLoaded, 'room')}
                </span>
            </p>
            <dl className="grid grid-cols-3 gap-4 border-t border-line bg-subtle/40 px-4 py-3 sm:px-5">
                <Fact label="Up for" value={formatUptime(data.startedAtUtc, now)} title={`Since ${formatDateTime(data.startedAtUtc)}`} />
                <Fact label="Memory" value={`${data.workingSetMb.toLocaleString()} MB`} title={`${data.managedMb.toLocaleString()} MB managed`} />
                <Fact label="Silos" value={`${data.silosActive} of ${data.silosTotal}`} />
            </dl>
        </section>
    );
};

/** A room of the busiest, with how full it is as a bar under its count: its people of the most it takes. */
const BusyRoom = ({ room, link }: { room: DashboardResponse['busiestRooms'][number]; link: boolean }) => {
    const full = room.playersMax > 0 ? Math.min(1, room.population / room.playersMax) : 0;

    return (
        <li className="flex min-h-14 items-center gap-4 border-t border-line px-4 py-2.5 first:border-t-0">
            <div className="min-w-0 flex-1">
                {link
                    ? <Link to={`/rooms/${room.id}`} className="block truncate font-medium hover:text-accent">{room.name}</Link>
                    : <span className="block truncate font-medium">{room.name}</span>}
                <span className="block truncate text-xs text-muted">{room.ownerName}</span>
            </div>
            <div className="flex w-24 shrink-0 flex-col items-end gap-1.5 sm:w-32">
                <span className="text-sm tabular-nums">
                    {room.population}
                    <span className="text-muted"> of {room.playersMax}</span>
                </span>
                <span aria-hidden className="h-1 w-full rounded-full bg-line">
                    <span className={cx('block h-1 rounded-full', full >= 0.9 ? 'bg-warn' : 'bg-accent-solid')} style={{ width: `${Math.max(4, Math.round(full * 100))}%` }} />
                </span>
            </div>
        </li>
    );
};

/**
 * What to do about a plugin that failed to load or was refused, from why: one refused is tried
 * again once its folder changes; one written against another server's contracts (its code names a
 * type, member or namespace this server lacks) is updated to this one.
 */
const fixFor = (plugin: Plugin) => {
    if (plugin.state === 'rejected')
        return 'Take out what the error names (an executable file, or code plugins may not run): it is tried again once a file in its folder changes.';

    return /\bCS(0234|0246|1061|0117)\b|could not load (type|file or assembly)|typeload|missingmethod|missingfield|method not found/i.test(plugin.error ?? '')
        ? 'Update it to this server\'s version and install it again, then reload it.'
        : 'Fix what the error names, then reload it.';
};

/**
 * The plugins whose last load failed, at the top of the overview: a plugin that failed adds
 * nothing to the hotel, and the plugins page is not where staff look first.
 */
const FailedPlugins = ({ plugins, canManage }: { plugins: Plugin[]; canManage: boolean }) => {
    const reload = useReloadPlugin();

    return (
        <Panel
            title={<span className="flex items-center gap-2 text-bad"><PlugZap className="size-4" />{`${plural(plugins.length, 'plugin')} did not load`}</span>}
            actions={<TextLink to="/plugins">Open plugins</TextLink>}
            className="border-bad-line"
        >
            <ul>
                {plugins.map(plugin => (
                    <li key={plugin.key} className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
                        <div className="min-w-0 flex-[1_1_16rem]">
                            <span className="block truncate font-medium">{plugin.name ?? plugin.folder}</span>
                            <span className="block truncate font-mono text-2xs text-bad" title={plugin.error ?? undefined}>{plugin.error ?? 'Its manifest could not be read.'}</span>
                            <span className="block text-xs text-muted">{fixFor(plugin)}</span>
                        </div>
                        {canManage && plugin.name && plugin.state !== 'rejected' && (
                            <Button variant="secondary" disabled={reload.isPending} onClick={() => reload.mutate(plugin.key)}>Reload</Button>
                        )}
                    </li>
                ))}
            </ul>
        </Panel>
    );
};

/** The failed and refused plugins, for staff who may see plugins; nothing when every plugin loaded. */
const PluginAlerts = () => {
    const { data } = usePlugins();
    const failed = data?.plugins.filter(x => x.state === 'failed' || x.state === 'rejected') ?? [];

    return failed.length > 0 ? <FailedPlugins plugins={failed} canManage={data?.canManage ?? false} /> : null;
};

const ATTENTION_TONES = {
    bad: { edge: 'border-bad-line', words: 'text-bad' },
    warn: { edge: 'border-warn-line', words: 'text-warn' },
};

/**
 * A card at the top of the overview about something to see to: what it is in its tone (the
 * failed plugins' card has its title so), a line on it, and where to fix it.
 */
const Attention = ({ tone, icon, title, link, children }: { tone: keyof typeof ATTENTION_TONES; icon: ReactNode; title: string; link: ReactNode; children: ReactNode }) => (
    <section className={cx('card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5', ATTENTION_TONES[tone].edge)}>
        <div className="min-w-0 flex-[1_1_16rem]">
            <h2 className={cx('flex items-center gap-2 text-sm font-semibold [&>svg]:size-4', ATTENTION_TONES[tone].words)}>{icon}{title}</h2>
            <div className="mt-0.5 text-xs text-muted">{children}</div>
        </div>
        {link}
    </section>
);

/**
 * Furniture the server runs as plain furniture where it has their logic (a group forum terminal
 * that opens no forum): a line on the overview, to the library's list of them.
 */
const LogicAlert = () => {
    const { data } = useFurnitureList('', '', 'logic-mismatch', 0);
    const count = data?.total ?? 0;

    return count > 0 && (
        <Attention
            tone="bad"
            icon={<Cpu />}
            title={`${count} furniture ${count === 1 ? 'runs' : 'run'} with the wrong logic`}
            link={<TextLink to="/gamedata/library/furniture?tag=logic-mismatch">Fix in the library</TextLink>}
        >
            The server has a logic for each, but runs it as plain furniture: in a room it does nothing of its own.
        </Attention>
    );
};

const VendingConfigAlert = () => {
    const { data } = useFurnitureList('', 'floor', 'vending-config-missing', 0);
    const count = data?.total ?? 0;

    return count > 0 && (
        <Attention
            tone="warn"
            icon={<CupSoda />}
            title={`${count} vending ${count === 1 ? 'machine needs' : 'machines need'} hand items`}
            link={<TextLink to="/gamedata/library/furniture?tag=vending-config-missing">Review vending machines</TextLink>}
        >
            Choose the items each machine gives in its furniture settings.
        </Attention>
    );
};

const NO_FILTER = { player: '', command: '', outcome: '', source: '' };

/** The last few commands staff and the console ran, newest first: what has been done lately, a click from the whole log. */
const RecentCommands = () => {
    const { data, error } = useCommandLog(NO_FILTER, 1, null);
    const canViewPlayers = useMe().data?.canViewPlayers ?? false;
    const entries = data?.entries.slice(0, 6);

    return (
        <Panel
            title="Recent commands"
            className="overflow-clip"
            actions={<TextLink to="/logs/command-log">The whole log <ChevronRight /></TextLink>}
        >
            {error && <div className="p-4"><ErrorNotice error={error} /></div>}
            {!data && !error && <Loading />}
            {entries?.length === 0 && <EmptyState>No commands yet.</EmptyState>}
            {entries && entries.length > 0 && (
                <ul>
                    {entries.map(entry => (
                        <li key={entry.id} className="flex min-h-12 items-center gap-3 border-t border-line px-4 py-2 first:border-t-0">
                            <span className="w-24 shrink-0 truncate text-sm font-medium">
                                {entry.playerId === 0
                                    ? <span className="font-normal text-muted">console</span>
                                    : canViewPlayers
                                        ? <Link to={`/players/${entry.playerId}`} className="hover:text-accent">{entry.playerName ?? `#${entry.playerId}`}</Link>
                                        : entry.playerName ?? `#${entry.playerId}`}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-mono text-ui">
                                :{entry.command}
                                {entry.arguments && <span className="text-muted"> {entry.arguments}</span>}
                            </span>
                            {/* Most go through: only those that didn't are marked. */}
                            {entry.outcome !== 'completed' && <span className="shrink-0 max-sm:hidden"><Outcome outcome={entry.outcome} /></span>}
                            <Ago at={entry.atUtc} className="shrink-0 text-xs text-muted" />
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
};

/**
 * The hotel at a glance, where the panel opens: who is on, how many rooms are running, how long the
 * server has been up and what it holds, the busiest rooms, and the hotel's controls for those who
 * may use them (beside the rooms from a laptop up, a button to their sheet below it).
 */
export const DashboardPage = () => {
    const tabs = useHubTabs('overview');
    const { data, error, isPending, dataUpdatedAt } = useDashboard();
    const canViewRooms = useMe().data?.canViewRooms ?? false;
    const canViewCommandLog = useMe().data?.canViewCommandLog ?? false;
    const canViewPlugins = useMe().data?.canViewPlugins ?? false;
    const canViewGamedata = useMe().data?.canViewGamedata ?? false;
    const canControl = useCanControlHotel();
    const live = useLive(state => state.connected);
    const now = useMinuteClock();

    return (
        <>
            <PageHeader
                title="Overview"
                tabs={tabs}
                description={data && `Turbo ${data.version}, updated ${formatClock(dataUpdatedAt)}`}
            >
                <span className="max-sm:hidden"><LiveBadge live={live}>{live ? 'Live' : 'Every 10 s'}</LiveBadge></span>
            </PageHeader>
            <PageBody>
                {error && <ErrorNotice error={error} />}
                {canViewPlugins && <PluginAlerts />}
                {canViewGamedata && <LogicAlert />}
                {canViewGamedata && <VendingConfigAlert />}
                {isPending && <Loading />}
                {data && (
                    <>
                        <HotelDesk data={data} now={Math.max(now, dataUpdatedAt)} canControl={canControl} />
                        <div className="flex flex-wrap items-start gap-4 lg:gap-6">
                            <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-4 lg:gap-6">
                                <Panel title="Busiest rooms">
                                    {data.busiestRooms.length === 0
                                        ? <EmptyState>Nobody is in a room right now.</EmptyState>
                                        : (
                                                <ul>
                                                    {data.busiestRooms.map(room => <BusyRoom key={room.id} room={room} link={canViewRooms} />)}
                                                </ul>
                                            )}
                                </Panel>
                                {canViewCommandLog && <RecentCommands />}
                            </div>
                            {canControl && (
                                <div className="min-w-0 flex-[1_1_380px] max-lg:hidden">
                                    <HotelControls phase={data.availability} atUtc={data.availabilityAtUtc} />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </PageBody>
        </>
    );
};
