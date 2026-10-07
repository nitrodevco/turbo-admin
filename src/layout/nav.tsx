import { Activity, Database, Gauge, House, KeyRound, MessagesSquare, ScrollText, ShieldCheck, SquareTerminal, Store, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';

import { useMe } from '#/api/queries';
import type { MeResponse } from '#/api/types';

export interface NavItem {
    to: string;
    label: string;
    icon: ReactNode;
    end: boolean;
    needs?: keyof Pick<MeResponse, 'canViewRooms' | 'canViewPlayers' | 'canViewPermissions' | 'canViewCommandLog' | 'canViewChatlog' | 'canViewCatalog' | 'canViewGamedata' | 'canResetPasskeys'>;
}

const NAV: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: <Gauge />, end: true },
    { to: '/performance', label: 'Performance', icon: <Activity />, end: false },
    { to: '/rooms', label: 'Rooms', icon: <House />, end: false, needs: 'canViewRooms' },
    { to: '/players', label: 'Players', icon: <Users />, end: false, needs: 'canViewPlayers' },
    { to: '/permissions', label: 'Permissions', icon: <KeyRound />, end: false, needs: 'canViewPermissions' },
    { to: '/catalog', label: 'Catalog', icon: <Store />, end: false, needs: 'canViewCatalog' },
    { to: '/gamedata', label: 'Gamedata', icon: <Database />, end: false, needs: 'canViewGamedata' },
    { to: '/command-log', label: 'Command log', icon: <ScrollText />, end: false, needs: 'canViewCommandLog' },
    { to: '/chatlog', label: 'Chat log', icon: <MessagesSquare />, end: false, needs: 'canViewChatlog' },
    { to: '/console', label: 'Console', icon: <SquareTerminal />, end: false },
    { to: '/staff', label: 'Staff', icon: <ShieldCheck />, end: false, needs: 'canResetPasskeys' },
];

/** The pages the signed-in player may open, in the order the navigation lists them. */
export const useNav = () => {
    const { data: me } = useMe();

    return NAV.filter(item => !item.needs || me?.[item.needs]);
};

/** The navigation's entry for the page open now: a room's pages are under Rooms. None for a page it has no entry for. */
export const useActiveNavItem = () => {
    const { pathname } = useLocation();

    return NAV.find(item => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)));
};
