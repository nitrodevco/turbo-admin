import { ChevronRight, Coins, House, Mail, MessagesSquare, ScrollText } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { type PlayerDetailResponse, type PlayerSanctionItem, usePlayer, usePlayerAbilities } from '#/api/players';
import { useMe, useRoomSearch } from '#/api/queries';
import { useRoomVisits } from '#/api/roomVisits';
import { TabbedPanel } from '#/components/TabbedPanel';
import { Ago, Badge, EmptyState, ErrorNotice, IconTile, Kv, Label, Loading, PageBody, Panel, Stat, TextLink } from '#/components/ui';
import { usePathTab } from '#/lib/tabs';
import { formatDateTime, fromNow } from '#/lib/time';

import { ActionAnswer } from './ActionAnswer';
import { CurrenciesPanel } from './CurrenciesPanel';
import { DiscordCard } from './DiscordCard';
import { InventoryTab } from './InventoryTab';
import { LoginTicketCard } from './LoginTicketCard';
import { PlayerControls } from './PlayerControls';
import { PlayerHeader } from './PlayerHeader';
import { PLAYER_TABS } from './playerTabs';
import { activeBan, restrictionLabel } from './restrictions';
import { usePlayerAction } from './usePlayerAction';

/** The row a tab's list draws each item in, as a room's people are drawn. */
const ROW = 'flex min-h-14 items-center gap-3 border-t border-line px-4 py-2 first:border-t-0';

/** What holds on them now, in words: "banned, for good · muted, ends in 2 hr"; empty when nothing does. */
const holdsOf = (player: PlayerDetailResponse) => {
    const ban = activeBan(player);

    return [
        ban && `banned, ${restrictionLabel({ untilUtc: ban.expiresUtc })}`,
        player.silenced && `muted, ${restrictionLabel(player.silenced)}`,
        player.tradeLocked && `trade locked, ${restrictionLabel(player.tradeLocked)}`,
    ].filter((x): x is string => !!x);
};

/**
 * A player's look, as the parts it is made of (a part's type, its id and colours), with the raw
 * string under a disclosure for copying.
 */
const Figure = ({ figure }: { figure: string }) => (
    <details className="group border-t border-line px-4 py-3">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <Label>Figure</Label>
            <span className="text-xs text-muted group-open:hidden">Show</span>
            <span className="hidden text-xs text-muted group-open:inline">Hide</span>
        </summary>
        <ul className="mt-2 flex flex-wrap gap-1.5">
            {figure.split('.').filter(part => part !== '').map((part, index) => (
                <li key={index}><Badge className="normal-case!">{part}</Badge></li>
            ))}
        </ul>
        <p className="mt-2 font-mono text-2xs break-all text-muted select-all">{figure}</p>
    </details>
);

/** Whether a sanction still holds, and if not why not. */
const SanctionState = ({ sanction }: { sanction: PlayerSanctionItem }) =>
    sanction.isActive
        ? <Badge tone="red">active</Badge>
        : sanction.revokedUtc
            ? <Badge>lifted</Badge>
            : <Badge>ended</Badge>;

/** Their bans and cautions, newest first: what, why, by whom, and until when. */
const Sanctions = ({ player }: { player: PlayerDetailResponse }) => {
    if (player.sanctions.length === 0)
        return <EmptyState>No sanctions, ever.</EmptyState>;

    return (
        <ul>
            {player.sanctions.map((sanction, index) => (
                <li key={index} className="flex flex-col gap-1.5 border-t border-line px-4 py-3 first:border-t-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="amber">{sanction.kind}</Badge>
                        <SanctionState sanction={sanction} />
                        <span className="ml-auto font-mono text-2xs text-muted">{formatDateTime(sanction.issuedUtc)}</span>
                    </div>
                    <p className="text-sm">{sanction.reason}</p>
                    <p className="font-mono text-2xs text-muted">
                        by {sanction.issuerName ?? 'the console'}
                        {sanction.expiresUtc ? ` · until ${formatDateTime(sanction.expiresUtc)}` : ' · permanent'}
                        {sanction.revokedUtc && ` · lifted ${formatDateTime(sanction.revokedUtc)}${sanction.revokedByName ? ` by ${sanction.revokedByName}` : ''}`}
                    </p>
                </li>
            ))}
        </ul>
    );
};

/** A link to the whole of a log or a list, over a tab that shows its first page, as a room's visitors have. */
const AllOf = ({ to, children }: { to: string; children: ReactNode }) => (
    <div className="flex justify-end border-b border-line px-4 py-2.5">
        <TextLink to={to}>{children}</TextLink>
    </div>
);

/** The rooms they own, livest first; asked for only when the tab is opened. */
const Rooms = ({ player }: { player: PlayerDetailResponse }) => {
    const { data, error, isPending } = useRoomSearch(String(player.id), 'ownerId', 1, null);

    if (isPending)
        return <Loading />;

    if (error)
        return <div className="p-4"><ErrorNotice error={error} /></div>;

    if (data.rooms.length === 0)
        return <EmptyState>They own no rooms.</EmptyState>;

    return (
        <>
            <AllOf to={`/rooms?${new URLSearchParams({ q: String(player.id), by: 'ownerId', page: '1' })}`}>Every room of theirs, in the list ›</AllOf>
            <ul>
                {data.rooms.map(room => (
                    <li key={room.id} className={ROW}>
                        <IconTile small tone="muted"><House /></IconTile>
                        <div className="min-w-0 flex-1">
                            <Link to={`/rooms/${room.id}`} className="block truncate text-sm font-medium hover:text-accent">{room.name}</Link>
                            <div className="truncate font-mono text-2xs text-muted">{[ `#${room.id}`, room.categoryName ].filter(Boolean).join(' · ')}</div>
                        </div>
                        {room.isLoaded
                            ? <Badge tone="green">{`${room.population}/${room.playersMax}`}</Badge>
                            : <Ago at={room.lastActiveUtc} className="text-xs text-muted" />}
                    </li>
                ))}
            </ul>
        </>
    );
};

/** The rooms they went into lately, newest first; asked for only when the tab is opened. */
const Visits = ({ player, linkRooms }: { player: PlayerDetailResponse; linkRooms: boolean }) => {
    const { data, error, isPending } = useRoomVisits({ player: String(player.id), room: '' }, 1, null);

    if (isPending)
        return <Loading />;

    if (error)
        return <div className="p-4"><ErrorNotice error={error} /></div>;

    if (data.entries.length === 0)
        return <EmptyState>They have gone into no room lately.</EmptyState>;

    return (
        <>
            <AllOf to={`/room-visits?${new URLSearchParams({ player: String(player.id) })}`}>Every visit, in the log ›</AllOf>
            <ul>
                {data.entries.map(visit => (
                    <li key={visit.id} className={ROW}>
                        <IconTile small tone="muted"><House /></IconTile>
                        <div className="min-w-0 flex-1 truncate text-sm">
                            {linkRooms && visit.roomName
                                ? <Link to={`/rooms/${visit.roomId}`} className="font-medium hover:underline">{visit.roomName}</Link>
                                : <span className="font-medium">{visit.roomName ?? `Room #${visit.roomId}`}</span>}
                        </div>
                        <Ago at={visit.atUtc} className="text-xs text-muted" />
                    </li>
                ))}
            </ul>
        </>
    );
};

/** Who they are at a glance, as a room's "who may do what" is: what holds on them, where they are, and their look. */
const Profile = ({ player, linkRooms }: { player: PlayerDetailResponse; linkRooms: boolean }) => {
    const holds = holdsOf(player);

    return (
        <Panel title="Profile">
            <dl>
                <Kv label="Standing">
                    {holds.length > 0
                        ? <span className={activeBan(player) ? 'text-bad' : 'text-warn'}>{holds.join(' · ')}</span>
                        : <span className="text-muted">nothing holds</span>}
                </Kv>
                {player.currentRoom
                    ? (
                            <Kv label="In room">
                                {linkRooms ? <TextLink inline to={`/rooms/${player.currentRoom.id}`}>{player.currentRoom.name}</TextLink> : player.currentRoom.name}
                            </Kv>
                        )
                    : <Kv label="Last login">{player.lastLoginUtc ? <Ago at={player.lastLoginUtc} /> : 'never'}</Kv>}
                <Kv label="Motto">{player.motto ?? <span className="text-muted">none</span>}</Kv>
                <Kv label="Joined">{formatDateTime(player.joinedUtc)}</Kv>
                <Kv label="Gender">{player.gender.toLowerCase()}</Kv>
            </dl>
            <Figure figure={player.figure} />
        </Panel>
    );
};

/** A way to one of the panel's logs, narrowed to this player. */
const LogRow = ({ to, icon, label, detail }: { to: string; icon: ReactNode; label: string; detail: string }) => (
    <li className="border-t border-line first:border-t-0">
        <Link to={to} className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-subtle/60 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted">
            {icon}
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block truncate text-xs text-muted">{detail}</span>
            </span>
            <ChevronRight />
        </Link>
    </li>
);

/** Their logs, each on its own page narrowed to them, for staff who may see it. */
const Logs = ({ player }: { player: PlayerDetailResponse }) => {
    const me = useMe().data;
    const who = String(player.id);

    if (!me || !(me.canViewPlayers || me.canViewChatlog || me.canViewMessages || me.canViewCommandLog))
        return null;

    return (
        <Panel title="Logs">
            <ul>
                {me.canViewPlayers && <LogRow to={`/currency-log?${new URLSearchParams({ player: who })}`} icon={<Coins />} label="Currency log" detail="Every change to their wallet, and why" />}
                {me.canViewChatlog && <LogRow to={`/chatlog?${new URLSearchParams({ player: who })}`} icon={<MessagesSquare />} label="Chat log" detail="What they said, and what was whispered to them" />}
                {me.canViewMessages && <LogRow to={`/messages?${new URLSearchParams({ player: who })}`} icon={<Mail />} label="Messages" detail="What they sent friends, and what friends sent them" />}
                {me.canViewCommandLog && <LogRow to={`/command-log?${new URLSearchParams({ player: who })}`} icon={<ScrollText />} label="Command log" detail="The commands they ran" />}
            </ul>
        </Panel>
    );
};

/**
 * A player as it stands, in a room's overview's order: what the last action did, the figures that
 * matter, then their balances (given and taken here) and their sanctions, rooms and visits beside
 * their controls, profile and logs (the controls first on a phone, a thumb away).
 */
const Overview = ({ player }: { player: PlayerDetailResponse }) => {
    const me = useMe().data;
    const action = usePlayerAction(player);
    const ban = activeBan(player);
    const holds = holdsOf(player);
    const linkRooms = me?.canViewRooms ?? false;

    return (
        <>
            <ActionAnswer action={action} />
            <section aria-label="At a glance" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Stat
                    label="Status"
                    value={player.isOnline ? 'Online' : 'Offline'}
                    detail={player.isOnline
                        ? player.currentRoom ? `in ${player.currentRoom.name}` : 'in no room'
                        : player.lastLoginUtc ? `seen ${fromNow(player.lastLoginUtc)}` : 'never logged in'}
                />
                <Stat label="Respect" value={player.respectPoints.toLocaleString()} />
                <Stat label="Rooms owned" value={player.roomsOwned.toLocaleString()} />
                <Stat
                    label="Sanctions"
                    value={player.sanctions.length.toLocaleString()}
                    tone={ban ? 'bad' : holds.length > 0 ? 'warn' : undefined}
                    detail={holds.length > 0 ? `${[ ban && 'banned', player.silenced && 'muted', player.tradeLocked && 'trade locked' ].filter(Boolean).join(' · ')} now` : undefined}
                />
            </section>

            <div className="flex flex-wrap items-start gap-4 lg:gap-6">
                <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 lg:gap-6">
                    <CurrenciesPanel player={player} action={action} />
                    <TabbedPanel
                        tabs={[
                            { id: 'sanctions', label: 'Sanctions', count: player.sanctions.length, content: <Sanctions player={player} /> },
                            ...(linkRooms ? [ { id: 'rooms', label: 'Rooms', count: player.roomsOwned, content: <Rooms player={player} /> } ] : []),
                            ...(me?.canViewPlayers ? [ { id: 'visits', label: 'Visits', content: <Visits player={player} linkRooms={linkRooms} /> } ] : []),
                        ]}
                    />
                </div>

                <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 max-lg:order-first lg:gap-6">
                    <PlayerControls player={player} action={action} />
                    <Profile player={player} linkRooms={linkRooms} />
                    <Logs player={player} />
                </div>
            </div>
        </>
    );
};

/**
 * How they sign in, side by side: a login ticket that logs in as them (issued and taken away here,
 * by staff who may), and the Discord account they sign in to the public site with.
 */
const Account = ({ player }: { player: PlayerDetailResponse }) => {
    const { data: abilities, isPending } = usePlayerAbilities();

    if (isPending)
        return <Loading />;

    if (!abilities?.issueTickets && !player.discord)
        return <EmptyState framed>They have no Discord account, and you may not issue login tickets.</EmptyState>;

    return (
        <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
            {abilities?.issueTickets && <LoginTicketCard key={`ticket-${player.id}`} playerId={player.id} playerName={player.name} />}
            {player.discord && <DiscordCard playerId={player.id} playerName={player.name} discord={player.discord} canManage={abilities?.manageAccounts ?? false} />}
        </div>
    );
};

/**
 * One player as staff look them up, laid out as a room is: a header that names them on every tab
 * (`PlayerHeader`, as `RoomHeader` does a room), the overview (`Overview`), the inventory (their
 * furniture and badges, with adding either), and their account (`Account`). Each tab is in the
 * path: `/players/5/inventory`.
 */
export const PlayerPage = () => {
    const id = Number(useParams().id);
    const [ tab, toTab ] = usePathTab(PLAYER_TABS);
    const { data: player, error, isPending } = usePlayer(id);

    if (toTab)
        return toTab;

    return (
        <>
            <PlayerHeader id={id} player={player} tab={tab} />
            <PageBody>
                {isPending && <Loading />}
                {error && <ErrorNotice error={error} />}
                {player && tab === 'overview' && <Overview key={player.id} player={player} />}
                {player && tab === 'inventory' && <InventoryTab player={player} />}
                {player && tab === 'account' && <Account player={player} />}
            </PageBody>
        </>
    );
};
