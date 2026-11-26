import { ChevronRight, Coins, DoorOpen, Gavel, Mail, MessagesSquare, ScrollText } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { type PlayerDetailResponse, usePlayer, usePlayerAbilities } from '#/api/players';
import { useMe } from '#/api/queries';
import { Ago, Badge, ErrorNotice, IconTile, Kv, Label, Loading, PageBody, Panel, Stat, TextLink } from '#/components/ui';
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
                <li key={index}><Badge>{part}</Badge></li>
            ))}
        </ul>
        <p className="mt-2 font-mono text-2xs break-all text-muted select-all">{figure}</p>
    </details>
);

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

/** A way to one of the panel's logs, narrowed to this player: a tile of the Logs card's grid. */
const LogTile = ({ to, icon, label, detail }: { to: string; icon: ReactNode; label: string; detail: string }) => (
    <li className="border-r border-b border-line">
        <Link to={to} className="group flex h-full items-start gap-3 px-4 py-3 transition-colors hover:bg-subtle/60">
            <IconTile small tone="muted">{icon}</IconTile>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{detail}</span>
            </span>
            <ChevronRight aria-hidden className="mt-2 size-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
        </Link>
    </li>
);

/**
 * Their logs, each on its own page narrowed to them, for staff who may see it, in the order the
 * Logs pages have: tiles as wide as the card lets them be, ruled between as the currencies are.
 */
const Logs = ({ player }: { player: PlayerDetailResponse }) => {
    const me = useMe().data;
    const who = String(player.id);

    if (!me || !(me.canViewPlayers || me.canViewChatlog || me.canViewMessages || me.canViewCommandLog))
        return null;

    return (
        <Panel title="Logs">
            <div className="overflow-hidden">
                <ul className="-mr-px -mb-px grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
                    {me.canViewCommandLog && <LogTile to={`/logs/command-log?${new URLSearchParams({ player: who })}`} icon={<ScrollText />} label="Command log" detail="The commands they ran" />}
                    {me.canViewChatlog && <LogTile to={`/logs/chat-log?${new URLSearchParams({ player: who })}`} icon={<MessagesSquare />} label="Chat log" detail="What they said, and what was whispered to them" />}
                    {me.canViewMessages && <LogTile to={`/logs/messages?${new URLSearchParams({ player: who })}`} icon={<Mail />} label="Messages" detail="What they sent friends, and what friends sent them" />}
                    {me.canViewPlayers && <LogTile to={`/logs/currency-log?${new URLSearchParams({ player: who })}`} icon={<Coins />} label="Currency log" detail="Every change to their wallet, and why" />}
                    {me.canViewPlayers && <LogTile to={`/logs/room-visits?${new URLSearchParams({ player: who })}`} icon={<DoorOpen />} label="Room visits" detail="The rooms they went into, and when" />}
                    {me.canViewPlayers && <LogTile to={`/logs/sanctions?${new URLSearchParams({ player: who })}`} icon={<Gavel />} label="Sanctions" detail={player.sanctions.length > 0 ? 'Their bans and cautions: why, by whom, until when' : 'No bans or cautions, ever'} />}
                </ul>
            </div>
        </Panel>
    );
};

/** A way on from a figure, under it: the room they are in, their rooms. */
const StatLink = ({ to, children }: { to: string; children: ReactNode }) => (
    <TextLink to={to} className="max-w-full">
        <span className="truncate">{children}</span>
        <ChevronRight />
    </TextLink>
);

/**
 * A player as it stands, in a room's overview's order: what the last action did, the figures that
 * matter (the room they are in and their rooms a click away), then their balances (given and taken
 * here) and their logs beside their controls (first on a phone, a thumb away). Who they are, their
 * profile, is on the Account tab.
 */
const Overview = ({ player }: { player: PlayerDetailResponse }) => {
    const me = useMe().data;
    const action = usePlayerAction(player);
    const ban = activeBan(player);
    const holds = holdsOf(player);
    const linkRooms = me?.canViewRooms ?? false;
    const room = player.currentRoom;

    return (
        <>
            <ActionAnswer action={action} />
            <section aria-label="At a glance" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Stat
                    label="Status"
                    value={player.isOnline ? 'Online' : 'Offline'}
                    detail={player.isOnline
                        ? room
                            ? <>in {linkRooms ? <StatLink to={`/rooms/${room.id}`}>{room.name}</StatLink> : room.name}</>
                            : 'in no room'
                        : player.lastLoginUtc ? `seen ${fromNow(player.lastLoginUtc)}` : 'never logged in'}
                />
                <Stat label="Respect" value={player.respectPoints.toLocaleString()} />
                <Stat
                    label="Rooms"
                    value={player.roomsOwned.toLocaleString()}
                    detail={linkRooms && player.roomsOwned > 0 && <StatLink to={`/rooms?${new URLSearchParams({ q: String(player.id), by: 'ownerId', page: '1' })}`}>Their rooms</StatLink>}
                />
                <Stat
                    label="Sanctions"
                    value={player.sanctions.length.toLocaleString()}
                    tone={ban ? 'bad' : holds.length > 0 ? 'warn' : undefined}
                    detail={holds.length > 0 ? `${[ ban && 'banned', player.silenced && 'muted', player.tradeLocked && 'trade locked' ].filter(Boolean).join(' · ')} now` : undefined}
                />
            </section>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
                    <CurrenciesPanel player={player} action={action} />
                    <Logs player={player} />
                </div>
                <div className="min-w-0 max-lg:order-first">
                    <PlayerControls player={player} action={action} />
                </div>
            </div>
        </>
    );
};

/**
 * Who they are and how they sign in: their profile (what holds on them, where they are, their
 * motto, look and when they joined) beside a login ticket that logs in as them (issued and taken
 * away here, by staff who may) and the Discord account they sign in to the public site with.
 */
const Account = ({ player }: { player: PlayerDetailResponse }) => {
    const me = useMe().data;
    const { data: abilities } = usePlayerAbilities();
    const tickets = abilities?.issueTickets ?? false;

    return (
        <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
            <Profile player={player} linkRooms={me?.canViewRooms ?? false} />
            {(tickets || player.discord) && (
                <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
                    {tickets && <LoginTicketCard key={`ticket-${player.id}`} playerId={player.id} playerName={player.name} />}
                    {player.discord && <DiscordCard playerId={player.id} playerName={player.name} discord={player.discord} canManage={abilities?.manageAccounts ?? false} />}
                </div>
            )}
        </div>
    );
};

/**
 * One player as staff look them up, laid out as a room is: a header that names them on every tab
 * (`PlayerHeader`, as `RoomHeader` does a room), the overview (`Overview`), the inventory (their
 * furniture and badges, with adding either), and their account (`Account`: their profile, login
 * ticket and Discord account). Each tab is in the
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
