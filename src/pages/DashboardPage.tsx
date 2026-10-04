import { Clock, Gauge, House, MemoryStick, Users } from 'lucide-react';
import { Link } from 'react-router';

import { useDashboard, useMe } from '#/api/queries';
import type { AvailabilityPhase } from '#/api/types';
import { Badge, EmptyState, ErrorNotice, Loading, PageBody, PageHeader, Panel, Stat, Td, Th } from '#/components/ui';

const AVAILABILITY: Record<string, { label: string; tone: 'green' | 'amber' | 'red' }> = {
    Open: { label: 'Open', tone: 'green' },
    MaintenanceScheduled: { label: 'Maintenance scheduled', tone: 'amber' },
    Maintenance: { label: 'In maintenance', tone: 'amber' },
    ShutdownScheduled: { label: 'Shutdown scheduled', tone: 'red' },
    ShuttingDown: { label: 'Shutting down', tone: 'red' },
};

const formatUptime = (startedAtUtc: string) => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAtUtc).getTime()) / 60_000));
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);

    return days > 0 ? `${days} d ${hours} h` : `${hours} h ${minutes % 60} min`;
};

const AvailabilityBadge = ({ phase, atUtc }: { phase: AvailabilityPhase; atUtc: string | null }) => {
    const known = AVAILABILITY[phase];

    return (
        <Badge tone={known?.tone ?? 'neutral'}>
            <span className="size-1.5 rounded-full bg-current" />
            {known?.label ?? phase}
            {atUtc && <span className="font-normal">at {new Date(atUtc).toLocaleTimeString()}</span>}
        </Badge>
    );
};

export const DashboardPage = () => {
    const { data, error, isPending, dataUpdatedAt } = useDashboard();
    const canViewRooms = useMe().data?.canViewRooms ?? false;

    return (
        <>
            <PageHeader
                title="Dashboard"
                icon={<Gauge />}
                description={data ? `Turbo ${data.version}, updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'The hotel right now'}
            >
                {data && <AvailabilityBadge phase={data.availability} atUtc={data.availabilityAtUtc} />}
            </PageHeader>
            <PageBody>
                {error && <div className="mb-4"><ErrorNotice error={error} /></div>}
                {isPending && <Loading />}
                {data && (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <Stat label="Players online" value={data.playersOnline.toLocaleString()} icon={<Users />} tone="bg-violet-500" />
                            <Stat label="Rooms loaded" value={data.roomsLoaded.toLocaleString()} icon={<House />} tone="bg-sky-500" />
                            <Stat label="Uptime" value={formatUptime(data.startedAtUtc)} detail={`Turbo ${data.version}`} icon={<Clock />} tone="bg-emerald-500" />
                            <Stat
                                label="Memory"
                                value={`${data.workingSetMb.toLocaleString()} MB`}
                                detail={`${data.managedMb.toLocaleString()} MB managed, ${data.silosActive} of ${data.silosTotal} silos active`}
                                icon={<MemoryStick />}
                                tone="bg-amber-500"
                            />
                        </div>
                        <Panel title="Busiest rooms" description="Updates every 10 seconds" className="mt-5 overflow-hidden">
                            {data.busiestRooms.length === 0
                                ? <EmptyState>Nobody is in a room right now.</EmptyState>
                                : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr>
                                                        <Th>Room</Th>
                                                        <Th>Owner</Th>
                                                        <Th className="text-right">Players</Th>
                                                    </tr>
                                                </thead>
                                                <tbody className="[&>tr:last-child>td]:border-b-0">
                                                    {data.busiestRooms.map(room => (
                                                        <tr key={room.id} className="hover:bg-subtle/60">
                                                            <Td>
                                                                {canViewRooms
                                                                    ? <Link to={`/rooms/${room.id}`} className="font-medium hover:text-accent">{room.name}</Link>
                                                                    : <span className="font-medium">{room.name}</span>}
                                                                <span className="ml-2 text-muted">#{room.id}</span>
                                                            </Td>
                                                            <Td className="text-muted">{room.ownerName}</Td>
                                                            <Td className="text-right tabular-nums">
                                                                {room.population}
                                                                <span className="text-muted"> / {room.playersMax}</span>
                                                            </Td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                        </Panel>
                    </>
                )}
            </PageBody>
        </>
    );
};
