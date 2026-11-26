import { Navigate } from 'react-router';

import { useMe } from '#/api/queries';
import { Loading } from '#/components/ui';
import { useNav } from '#/layout/nav';

/** `/logs` on its own: the first log the viewer may open, or the overview for someone who may open none. */
export const LogsHome = () => {
    const me = useMe().data;
    const to = useNav().flatMap(section => section.entries).find(entry => entry.label === 'Logs')?.to;

    if (to)
        return <Navigate to={to} replace />;

    return me ? <Navigate to="/" replace /> : <Loading />;
};
