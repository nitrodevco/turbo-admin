import { Armchair, Bot, House, MessagesSquare, PawPrint, Settings } from 'lucide-react';

import { useMe } from '#/api/queries';
import type { RoomDetailResponse } from '#/api/types';
import type { TabItem } from '#/components/Tabs';
import { ButtonLink, ErrorNotice, LiveBadge, PageHeader, SuccessNotice } from '#/components/ui';
import { useRememberRecent } from '#/lib/recent';

import { doorModeLabel } from './labels';

/**
 * The header of a room's pages: its name, the facts that identify it, whether it is live, its
 * chat log (for staff who may read it), and its tabs. Settings is a tab only for staff who may
 * change them. A player's pages have the same header (`PlayerHeader`).
 */
export const RoomHeader = ({ id, room, tab }: { id: number; room: RoomDetailResponse | undefined; tab: 'overview' | 'furniture' | 'bots' | 'pets' | 'settings' }) => {
    useRememberRecent('room', id, room?.name);
    const me = useMe().data;

    const tabs: TabItem[] = [
        { value: 'overview', label: 'Overview', icon: <House />, to: `/rooms/${id}/overview` },
        { value: 'furniture', label: 'Furniture', icon: <Armchair />, to: `/rooms/${id}/furniture` },
        { value: 'bots', label: 'Bots', icon: <Bot />, to: `/rooms/${id}/bots` },
        { value: 'pets', label: 'Pets', icon: <PawPrint />, to: `/rooms/${id}/pets` },
        ...(room?.can.editSettings ? [ { value: 'settings', label: 'Settings', icon: <Settings />, to: `/rooms/${id}/settings` } ] : []),
    ];

    return (
        <PageHeader
            title={room?.name ?? `Room #${id}`}
            back={{ to: '/rooms', label: 'Rooms' }}
            tabs={{ items: tabs, value: tab }}
            description={room && [
                `#${room.id}`,
                `owner ${room.ownerName}`,
                room.categoryName,
                `${doorModeLabel(room.doorMode).toLowerCase()} door`,
            ].filter(Boolean).join(' · ')}
        >
            {room && (
                <LiveBadge live={room.isLoaded}>
                    {room.isLoaded ? `LIVE · ${room.playersInside.length}/${room.playersMax}` : 'NOT LOADED'}
                </LiveBadge>
            )}
            {me?.canViewChatlog && <ButtonLink to={`/chatlog?${new URLSearchParams({ room: String(id) })}`} icon={<MessagesSquare />}>Chat</ButtonLink>}
        </PageHeader>
    );
};

/** The answer to the last action on the room: its sentence, or why it was refused. */
export const ActionOutcome = ({ message, error }: { message: string | undefined; error: unknown }) => {
    if (error)
        return <ErrorNotice error={error} />;

    return message ? <SuccessNotice>{message}</SuccessNotice> : null;
};
