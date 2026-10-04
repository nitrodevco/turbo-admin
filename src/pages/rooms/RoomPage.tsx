import { House } from 'lucide-react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router';

import { useRoom } from '#/api/queries';
import type { RoomPlayerRef } from '#/api/types';
import { TabbedPanel } from '#/components/TabbedPanel';
import { Badge, ErrorNotice, Loading, PageBody, PageHeader, Panel } from '#/components/ui';

import { chatFloodLabel, doorModeLabel, formatDateTime, tradeModeLabel, whoLabel } from './labels';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

/** A label and its value, as one row of a settings list. */
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex justify-between gap-4 px-4 py-2 text-sm">
        <dt className="text-muted">{label}</dt>
        <dd className="text-right">{children}</dd>
    </div>
);

const PlayerList = ({ players, empty }: { players: RoomPlayerRef[]; empty: string }) =>
    players.length === 0
        ? <p className="px-4 py-3 text-sm text-muted">{empty}</p>
        : (
                <ul className="divide-y divide-line text-sm">
                    {players.map(player => (
                        <li key={player.id} className="flex justify-between px-4 py-2">
                            <span>{player.name}</span>
                            <span className="text-muted">#{player.id}</span>
                        </li>
                    ))}
                </ul>
            );

/** One room as it stands: its settings, who is in it now, and (in one tabbed card) who holds rights or a ban. */
export const RoomPage = () => {
    const id = Number(useParams().id);
    const { data: room, error, isPending } = useRoom(id);

    return (
        <>
            <PageHeader
                title={room?.name ?? `Room #${id}`}
                icon={<House />}
                back={{ to: '/rooms', label: 'Rooms' }}
                tab="Overview"
                description={room && (
                    <>
                        Room #{room.id}, owned by <span className="text-ink">{room.ownerName}</span>
                        {room.description && ` - ${room.description}`}
                    </>
                )}
            >
                {room && (
                    <Badge tone={room.isLoaded ? 'green' : 'neutral'}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {room.isLoaded ? `Loaded, ${room.playersInside.length} / ${room.playersMax} inside` : 'Not loaded'}
                    </Badge>
                )}
            </PageHeader>
            <PageBody>
                {isPending && <Loading />}
                {error && <ErrorNotice error={error} />}
                {room && (
                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="grid content-start gap-5">
                            <Panel title="Access">
                                <dl className="divide-y divide-line">
                                    <Row label="Door">{doorModeLabel(room.doorMode)}</Row>
                                    <Row label="Password">{room.hasPassword ? 'Set' : 'None'}</Row>
                                    <Row label="Maximum players">{room.playersMax}</Row>
                                    <Row label="Trading">{tradeModeLabel(room.tradeMode)}</Row>
                                    <Row label="Pets allowed">{yesNo(room.allowPets)}</Row>
                                    <Row label="Others may feed pets">{yesNo(room.allowPetsEat)}</Row>
                                    <Row label="Walk through others">{yesNo(room.allowWalkThrough)}</Row>
                                </dl>
                            </Panel>
                            <Panel title="Moderation">
                                <dl className="divide-y divide-line">
                                    <Row label="Who can mute">{whoLabel(room.whoCanMute)}</Row>
                                    <Row label="Who can kick">{whoLabel(room.whoCanKick)}</Row>
                                    <Row label="Who can ban">{whoLabel(room.whoCanBan)}</Row>
                                    <Row label="Chat flood protection">{chatFloodLabel(room.chatFloodProtection)}</Row>
                                </dl>
                            </Panel>
                            <Panel title="Listing">
                                <dl className="divide-y divide-line">
                                    <Row label="Category">{room.categoryName ?? 'None'}</Row>
                                    <Row label="Tags">{room.tags.length > 0 ? room.tags.join(', ') : 'None'}</Row>
                                    <Row label="Staff pick">{yesNo(room.staffPick)}</Row>
                                    <Row label="Hidden by Builders Club">{yesNo(room.hiddenByBuildersClub)}</Row>
                                    <Row label="Score">{room.score}</Row>
                                    <Row label="Model">{room.model}</Row>
                                    <Row label="Walls hidden">{yesNo(room.hideWalls)}</Row>
                                    <Row label="Created">{formatDateTime(room.createdAtUtc)}</Row>
                                    <Row label="Last active">{formatDateTime(room.lastActiveUtc)}</Row>
                                </dl>
                            </Panel>
                        </div>
                        <div className="grid content-start gap-5">
                            <Panel title={`In the room now (${room.playersInside.length})`}>
                                <PlayerList
                                    players={room.playersInside}
                                    empty={room.isLoaded ? 'Nobody is in the room.' : 'The room is not loaded, so nobody is in it.'}
                                />
                            </Panel>
                            <TabbedPanel
                                tabs={[
                                    {
                                        id: 'rights',
                                        label: 'Rights',
                                        count: room.rightsHolders.length,
                                        content: <PlayerList players={room.rightsHolders} empty="Nobody has rights besides the owner." />,
                                    },
                                    {
                                        id: 'bans',
                                        label: 'Bans',
                                        count: room.bans.length,
                                        content: room.bans.length === 0
                                            ? <p className="px-4 py-3 text-sm text-muted">Nobody is banned.</p>
                                            : (
                                                    <ul className="divide-y divide-line text-sm">
                                                        {room.bans.map(ban => (
                                                            <li key={ban.playerId} className="flex justify-between gap-4 px-4 py-2">
                                                                <span>{ban.name}</span>
                                                                <span className="text-muted">until {formatDateTime(ban.expiresAtUtc)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ),
                                    },
                                ]}
                            />
                        </div>
                    </div>
                )}
            </PageBody>
        </>
    );
};
