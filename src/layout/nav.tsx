import { Activity, Database, Gauge, House, KeyRound, MessagesSquare, ScrollText, ShieldCheck, SquareTerminal, Store, UserRound, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';

import { useMe } from '#/api/queries';
import type { MeResponse } from '#/api/types';

export interface NavItem {
    to: string;
    label: string;
    icon: ReactNode;
    end: boolean;
    /** The letter after `g` that goes to it (`Shortcuts`). */
    key: string;
    needs?: keyof Pick<MeResponse, 'canViewRooms' | 'canViewPlayers' | 'canViewPermissions' | 'canViewCommandLog' | 'canViewChatlog' | 'canViewCatalog' | 'canViewGamedata' | 'canResetPasskeys'>;
}

const NAV: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: <Gauge />, end: true, key: 'd' },
    { to: '/performance', label: 'Performance', icon: <Activity />, end: false, key: 'm' },
    { to: '/rooms', label: 'Rooms', icon: <House />, end: false, key: 'r', needs: 'canViewRooms' },
    { to: '/players', label: 'Players', icon: <Users />, end: false, key: 'p', needs: 'canViewPlayers' },
    { to: '/permissions', label: 'Permissions', icon: <KeyRound />, end: false, key: 'k', needs: 'canViewPermissions' },
    { to: '/catalog', label: 'Catalog', icon: <Store />, end: false, key: 'c', needs: 'canViewCatalog' },
    { to: '/gamedata', label: 'Gamedata', icon: <Database />, end: false, key: 'g', needs: 'canViewGamedata' },
    { to: '/command-log', label: 'Command log', icon: <ScrollText />, end: false, key: 'l', needs: 'canViewCommandLog' },
    { to: '/chatlog', label: 'Chat log', icon: <MessagesSquare />, end: false, key: 'h', needs: 'canViewChatlog' },
    { to: '/console', label: 'Console', icon: <SquareTerminal />, end: false, key: 'o' },
    { to: '/staff', label: 'Staff', icon: <ShieldCheck />, end: false, key: 's', needs: 'canResetPasskeys' },
];

/** The pages the signed-in player may open, in the order the navigation lists them. */
export const useNav = () => {
    const { data: me } = useMe();

    return NAV.filter(item => !item.needs || me?.[item.needs]);
};

/** Your account: no entry in the navigation (it is at the sidebar's foot), but a page all the same. */
const ACCOUNT: NavItem = { to: '/account', label: 'Account', icon: <UserRound />, end: false, key: 'a' };

/** Every page the signed-in player may open, the account too: where `g` and a letter go, and what the search offers by name. */
export const usePages = () => [ ...useNav(), ACCOUNT ];

/** The navigation's entry for the page open now: a room's pages are under Rooms. None for a page it has no entry for. */
export const useActiveNavItem = () => {
    const { pathname } = useLocation();

    return [ ...NAV, ACCOUNT ].find(item => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)));
};
