import { KeyRound, MessagesSquare, ScrollText } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { type PlayerSanctionItem, usePlayer, usePlayerAbilities } from '#/api/players';
import { useMe } from '#/api/queries';
import { Avatar, Badge, EmptyState, ErrorNotice, Kv, Label, LiveBadge, Loading, PageBody, PageHeader, Panel, Stat } from '#/components/ui';
import { fromNow } from '#/lib/time';
import { formatDateTime } from '#/pages/rooms/labels';

import { DiscordCard } from './DiscordCard';
import { InventoryPanel } from './InventoryPanel';
import { LoginTicketCard } from './LoginTicketCard';
import { PlayerActions } from './PlayerActions';

/** Whether a sanction still holds, and if not why not. */
const SanctionState = ({ sanction }: { sanction: PlayerSanctionItem }) =>
    sanction.isActive
        ? <Badge tone="red">active</Badge>
        : sanction.revokedUtc
            ? <Badge>lifted</Badge>
            : <Badge>ended</Badge>;

/**
 * One player as staff look them up: whether they are online and where, their balances, profile,
 * the rooms they own, their sanctions, what they own and where they've been, with a way to their
 * permissions.
 */
export const PlayerPage = () => {
    const id = Number(useParams().id);
    const { data: player, error, isPending } = usePlayer(id);
    const me = useMe().data;
    const abilities = usePlayerAbilities().data;

    return (
        <>
            <PageHeader
                title={player?.name ?? `Player #${id}`}
                back={{ to: '/players', label: 'Players' }}
                description={player && `#${player.id} · joined ${fromNow(player.joinedUtc)}`}
            >
                {player && (
                    <LiveBadge live={player.isOnline}>
                        {player.isOnline
                            ? player.currentRoom ? `ONLINE · ${player.currentRoom.name}` : 'ONLINE'
                            : player.lastLoginUtc ? `SEEN ${fromNow(player.lastLoginUtc).toUpperCase()}` : 'NEVER LOGGED IN'}
                    </LiveBadge>
                )}
                {player && me?.canViewPermissions && (
                    <Link
                        to={`/permissions/players/${player.id}`}
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-subtle px-3.5 text-sm font-medium hover:border-muted/50 sm:h-9 [&>svg]:size-4"
                    >
                        <KeyRound />
                        Permissions
                    </Link>
                )}
                {player && me?.canViewCommandLog && (
                    <Link
                        to={`/command-log?${new URLSearchParams({ player: String(player.id) })}`}
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-subtle px-3.5 text-sm font-medium hover:border-muted/50 sm:h-9 [&>svg]:size-4"
                    >
                        <ScrollText />
                        Commands
                    </Link>
                )}
                {player && me?.canViewChatlog && (
                    <Link
                        to={`/chatlog?${new URLSearchParams({ player: String(player.id) })}`}
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-subtle px-3.5 text-sm font-medium hover:border-muted/50 sm:h-9 [&>svg]:size-4"
                    >
                        <MessagesSquare />
                        Chat
                    </Link>
                )}
            </PageHeader>
            <PageBody className="flex flex-col gap-4 lg:gap-5 lg:pt-1">
                {isPending && <Loading />}
                {error && <ErrorNotice error={error} />}
                {player && (
                    <>
                        <section aria-label="Balances" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            {player.currencies.map(currency => (
                                <Stat key={currency.typeId} label={currency.name} value={currency.amount.toLocaleString()} />
                            ))}
                            <Stat label="Respect" value={player.respectPoints.toLocaleString()} />
                        </section>

                        <div className="flex flex-wrap items-start gap-4 lg:gap-5">
                            <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 lg:gap-5">
                                <Panel title={`Sanctions (${player.sanctions.length})`} actions={player.sanctions.some(x => x.isActive) ? <Badge tone="red">{player.sanctions.filter(x => x.isActive).length} active</Badge> : undefined}>
                                    {player.sanctions.length === 0
                                        ? <EmptyState>No sanctions, ever.</EmptyState>
                                        : (
                                                <ul>
                                                    {player.sanctions.map((sanction, index) => (
                                                        <li key={index} className="flex flex-col gap-1.5 border-t border-line px-4 py-3 first:border-t-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge tone="amber">{sanction.kind}</Badge>
                                                                <SanctionState sanction={sanction} />
                                                                <span className="ml-auto font-mono text-[11px] text-muted">{formatDateTime(sanction.issuedUtc)}</span>
                                                            </div>
                                                            <p className="text-sm">{sanction.reason}</p>
                                                            <p className="font-mono text-[11px] text-muted">
                                                                by {sanction.issuerName ?? 'the console'}
                                                                {sanction.expiresUtc ? ` · until ${formatDateTime(sanction.expiresUtc)}` : ' · permanent'}
                                                                {sanction.revokedUtc && ` · lifted ${formatDateTime(sanction.revokedUtc)}${sanction.revokedByName ? ` by ${sanction.revokedByName}` : ''}`}
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                </Panel>

                                <Panel
                                    title={`Rooms (${player.roomsOwned})`}
                                    actions={player.roomsOwned > player.recentRooms.length && me?.canViewRooms
                                        ? <Link to={`/rooms?${new URLSearchParams({ q: player.name, by: 'owner', page: '1' })}`} className="text-xs text-accent hover:underline">All {player.roomsOwned}</Link>
                                        : undefined}
                                >
                                    {player.recentRooms.length === 0
                                        ? <EmptyState>Owns no rooms.</EmptyState>
                                        : (
                                                <ul>
                                                    {player.recentRooms.map(room => (
                                                        <li key={room.id} className="border-t border-line first:border-t-0">
                                                            {me?.canViewRooms
                                                                ? (
                                                                        <Link to={`/rooms/${room.id}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 hover:bg-subtle/60">
                                                                            <span className="truncate text-sm font-medium">{room.name}</span>
                                                                            <span className="font-mono text-[11px] text-muted">#{room.id}</span>
                                                                        </Link>
                                                                    )
                                                                : (
                                                                        <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                                                                            <span className="truncate text-sm">{room.name}</span>
                                                                            <span className="font-mono text-[11px] text-muted">#{room.id}</span>
                                                                        </div>
                                                                    )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                </Panel>

                                <InventoryPanel player={player} />
                            </div>

                            <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 max-lg:order-first lg:gap-5">
                                <PlayerActions key={player.id} player={player} />
                                {abilities?.issueTickets && <LoginTicketCard key={`ticket-${player.id}`} playerId={player.id} playerName={player.name} />}
                                {player.discord && <DiscordCard playerId={player.id} playerName={player.name} discord={player.discord} canManage={abilities?.manageAccounts ?? false} />}
                                <Panel title="Profile">
                                    <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                                        <Avatar id={player.id} name={player.name} className="size-12 text-sm sm:size-12" />
                                        <div className="min-w-0">
                                            <div className="truncate font-medium">{player.name}</div>
                                            <div className="truncate text-sm text-muted">{player.motto ?? 'No motto'}</div>
                                        </div>
                                    </div>
                                    <dl>
                                        <Kv label="Status">{player.isOnline ? 'online' : 'offline'}</Kv>
                                        {player.currentRoom && (
                                            <Kv label="In room">
                                                {me?.canViewRooms
                                                    ? <Link to={`/rooms/${player.currentRoom.id}`} className="text-accent hover:underline">{player.currentRoom.name}</Link>
                                                    : player.currentRoom.name}
                                            </Kv>
                                        )}
                                        <Kv label="Last login">{player.lastLoginUtc ? formatDateTime(player.lastLoginUtc) : 'never'}</Kv>
                                        <Kv label="Joined">{formatDateTime(player.joinedUtc)}</Kv>
                                        <Kv label="Gender">{player.gender.toLowerCase()}</Kv>
                                    </dl>
                                    <div className="border-t border-line px-4 py-3">
                                        <Label>Figure</Label>
                                        <p className="mt-1 font-mono text-[11px] break-all text-muted">{player.figure}</p>
                                    </div>
                                </Panel>
                            </div>
                        </div>
                    </>
                )}
            </PageBody>
        </>
    );
};
