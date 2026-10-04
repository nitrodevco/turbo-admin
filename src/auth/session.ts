import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AdminPlayer, SessionResponse } from '#/api/types';

export interface Session {
    token: string;
    expiresAtUtc: string;
    player: AdminPlayer;
}

interface SessionState {
    session: Session | null;
    signIn: (session: Session) => void;
    signOut: () => void;
}

/**
 * The signed-in session. Kept across reloads and tabs; the server owns its lifetime, so an
 * expired or revoked one is dropped the first time the API answers 401.
 */
export const useSession = create<SessionState>()(
    persist(
        set => ({
            session: null,
            signIn: session => set({ session }),
            signOut: () => set({ session: null }),
        }),
        {
            name: 'turbo-admin-session',
            storage: createJSONStorage(() => localStorage),
        },
    ),
);

export const isLive = (session: Session | null): session is Session =>
    session !== null && new Date(session.expiresAtUtc).getTime() > Date.now();

export const toSession = (response: SessionResponse): Session => ({
    token: response.sessionToken,
    expiresAtUtc: response.expiresAtUtc,
    player: response.player,
});
