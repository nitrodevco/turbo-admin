import type { ReactNode } from 'react';
import { Navigate } from 'react-router';

import { isLive, useSession } from './session';

/** Sends anyone without a live session to sign in. */
export const RequireSession = ({ children }: { children: ReactNode }) => {
    const session = useSession(state => state.session);

    return isLive(session) ? children : <Navigate to="/login" replace />;
};
