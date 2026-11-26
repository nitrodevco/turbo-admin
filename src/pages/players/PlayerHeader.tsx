import { KeyRound } from 'lucide-react';

import type { PlayerDetailResponse } from '#/api/players';
import { useMe } from '#/api/queries';
import { Avatar, ButtonLink, PageHeader } from '#/components/ui';
import { useRememberRecent } from '#/lib/recent';
import { fromNow } from '#/lib/time';

import { PLAYER_TAB_LABELS, PLAYER_TABS, type PlayerTab } from './playerTabs';

/**
 * The header of a player's pages, as a room's (`RoomHeader`) is: their name and head, the facts
 * that identify them, their permissions (for staff who may see them), and the tabs. Whether they
 * are online and where is the overview's first figure; their logs are on the overview too.
 */
export const PlayerHeader = ({ id, player, tab }: { id: number; player: PlayerDetailResponse | undefined; tab: PlayerTab }) => {
    useRememberRecent('player', id, player?.name);
    const me = useMe().data;

    return (
        <PageHeader
            title={player?.name ?? `Player #${id}`}
            back={{ to: '/players', label: 'Players' }}
            icon={player && <Avatar id={player.id} name={player.name} figure={player.figure} className="size-10 rounded-xl sm:size-10" />}
            tabs={{ items: PLAYER_TABS.map(value => ({ value, label: PLAYER_TAB_LABELS[value], to: `/players/${id}/${value}` })), value: tab }}
            description={player && `#${player.id} · joined ${fromNow(player.joinedUtc)}`}
        >
            {me?.canViewPermissions && <ButtonLink to={`/permissions/players/${id}`} icon={<KeyRound />}>Permissions</ButtonLink>}
        </PageHeader>
    );
};
