import { KeyRound, MessagesSquare } from 'lucide-react';

import { type PlayerDetailResponse, usePlayerAbilities } from '#/api/players';
import { useMe } from '#/api/queries';
import { Avatar, ButtonLink, LiveBadge, PageHeader } from '#/components/ui';
import { useRememberRecent } from '#/lib/recent';
import { fromNow } from '#/lib/time';

import { PLAYER_TAB_LABELS, PLAYER_TABS, type PlayerTab } from './playerTabs';

/**
 * The header of a player's pages, as a room's (`RoomHeader`) is: their name and head, the facts
 * that identify them, whether they are online, their chat log and permissions (for staff who may
 * see them), and the tabs. Account is a tab only when it has something for you: a login ticket you
 * may issue, or their Discord account.
 */
export const PlayerHeader = ({ id, player, tab }: { id: number; player: PlayerDetailResponse | undefined; tab: PlayerTab }) => {
    useRememberRecent('player', id, player?.name);
    const me = useMe().data;
    const issuesTickets = usePlayerAbilities().data?.issueTickets ?? false;
    const tabs = PLAYER_TABS.filter(value => value !== 'account' || issuesTickets || !!player?.discord);

    return (
        <PageHeader
            title={player?.name ?? `Player #${id}`}
            back={{ to: '/players', label: 'Players' }}
            icon={player && <Avatar id={player.id} name={player.name} figure={player.figure} className="size-10 rounded-xl sm:size-10" />}
            tabs={{ items: tabs.map(value => ({ value, label: PLAYER_TAB_LABELS[value], to: `/players/${id}/${value}` })), value: tab }}
            description={player && [
                `#${player.id}`,
                `joined ${fromNow(player.joinedUtc)}`,
                player.motto && `“${player.motto}”`,
            ].filter(Boolean).join(' · ')}
        >
            {player && (
                <LiveBadge live={player.isOnline}>
                    {player.isOnline
                        ? player.currentRoom ? `ONLINE · ${player.currentRoom.name}` : 'ONLINE'
                        : player.lastLoginUtc ? `SEEN ${fromNow(player.lastLoginUtc).toUpperCase()}` : 'NEVER LOGGED IN'}
                </LiveBadge>
            )}
            {me?.canViewChatlog && <ButtonLink to={`/chatlog?${new URLSearchParams({ player: String(id) })}`} icon={<MessagesSquare />}>Chat</ButtonLink>}
            {me?.canViewPermissions && <ButtonLink to={`/permissions/players/${id}`} icon={<KeyRound />}>Permissions</ButtonLink>}
        </PageHeader>
    );
};
