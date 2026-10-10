import { Link } from 'react-router';

import { useLive } from '#/api/live';
import { useDashboard, useMe } from '#/api/queries';
import type { AvailabilityPhase } from '#/api/types';
import { Badge, EmptyState, ErrorNotice, Label, LiveBadge, Loading, PageBody, PageHeader, Panel, Stat } from '#/components/ui';
import { phaseOf } from '#/layout/availability';
import { useHubTabs } from '#/layout/nav';

import { HotelControls } from './HotelControls';

const TONES = { good: 'green', warn: 'amber', bad: 'red' } as const;

const formatUptime = (startedAtUtc: string) => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAtUtc).getTime()) / 60_000));
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);

    return days > 0 ? `${days} d ${hours} h` : `${hours} h ${minutes % 60} min`;
};

const AvailabilityBadge = ({ phase, atUtc }: { phase: AvailabilityPhase; atUtc: string | null }) => {
    const known = phaseOf(phase);

    return (
        <Badge tone={TONES[known.tone]}>
            <span className="size-1.5 rounded-full bg-current" />
            {known.label}
            {atUtc && <span className="font-normal">at {new Date(atUtc).toLocaleTimeString()}</span>}
        </Badge>
    );
};

export const DashboardPage = () => {
    const tabs = useHubTabs('overview');
    const { data, error, isPending, dataUpdatedAt } = useDashboard();
    const canViewRooms = useMe().data?.canViewRooms ?? false;
    const live = useLive(state => state.connected);

    return (
        <>
            <PageHeader
                title="Overview"
                tabs={tabs}
                description={data ? `Turbo ${data.version} · updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'The hotel right now'}
            >
                <LiveBadge live={live}>{live ? 'LIVE' : 'EVERY 10S'}</LiveBadge>
                {data && <AvailabilityBadge phase={data.availability} atUtc={data.availabilityAtUtc} />}
            </PageHeader>
            <PageBody className="flex flex-col gap-4 lg:gap-5">
                {error && <ErrorNotice error={error} />}
                {isPending && <Loading />}
                {data && (
                    <>
                        <section aria-label="At a glance" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            <Stat label="Players online" value={data.playersOnline.toLocaleString()} />
                            <Stat label="Rooms loaded" value={data.roomsLoaded.toLocaleString()} />
                            <Stat label="Uptime" value={formatUptime(data.startedAtUtc)} detail={`Turbo ${data.version}`} />
                            <Stat
                                label="Memory"
                                value={`${data.workingSetMb.toLocaleString()} MB`}
                                detail={`${data.managedMb.toLocaleString()} MB managed · ${data.silosActive}/${data.silosTotal} silos`}
                            />
                        </section>
                        <div className="flex flex-wrap items-start gap-4 lg:gap-5">
                            <div className="min-w-0 flex-[999_1_480px]">
                                <Panel title="Busiest rooms" actions={live ? undefined : <Label>refreshes every 10 s</Label>}>
                                    {data.busiestRooms.length === 0
                                        ? <EmptyState>Nobody is in a room right now.</EmptyState>
                                        : (
                                                <ul>
                                                    {data.busiestRooms.map(room => (
                                                        <li key={room.id} className="flex min-h-14 items-center gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
                                                            <div className="min-w-0 flex-1">
                                                                {canViewRooms
                                                                    ? <Link to={`/rooms/${room.id}`} className="block truncate font-medium hover:text-accent">{room.name}</Link>
                                                                    : <span className="block truncate font-medium">{room.name}</span>}
                                                                <span className="block truncate font-mono text-[11px] text-muted">#{room.id} · {room.ownerName}</span>
                                                            </div>
                                                            <span className="shrink-0 font-mono text-sm tabular-nums">
                                                                {room.population}
                                                                <span className="text-muted">/{room.playersMax}</span>
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                </Panel>
                            </div>
                            <div className="min-w-0 flex-[1_1_320px] max-lg:hidden">
                                <HotelControls phase={data.availability} />
                            </div>
                        </div>
                    </>
                )}
            </PageBody>
        </>
    );
};
