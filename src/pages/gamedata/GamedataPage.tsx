import { useSearchParams } from 'react-router';

import { useGamedataStatus } from '#/api/gamedata';
import { ErrorNotice, Loading, PageBody, PageHeader } from '#/components/ui';

import { FurnitureTab } from './FurnitureTab';
import { HistoryTab } from './HistoryTab';
import { ImportTab } from './ImportTab';
import { OverviewTab } from './OverviewTab';

const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'import', label: 'Habbo update' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'history', label: 'History' },
];

/**
 * The hotel's gamedata: the files the client loads, built from the database, and where their
 * content comes from - Habbo's releases, taken in after a look at what they change, and the
 * hotel's own edits, which Habbo's later updates leave alone. Every change is in the history and
 * can be rolled back.
 */
export const GamedataPage = () => {
    const [ params, setParams ] = useSearchParams();
    const tab = TABS.some(x => x.value === params.get('tab')) ? params.get('tab')! : 'overview';
    const { data: status, error } = useGamedataStatus();

    return (
        <>
            <PageHeader
                title="Gamedata"
                description="FurnitureData built from the furniture definitions, its offers stamped from the catalog"
                tabs={{ items: TABS, value: tab, onChange: value => setParams({ tab: value }, { replace: true }) }}
            />
            <PageBody className="flex flex-col gap-4">
                {error && <ErrorNotice error={error} />}
                {!status && !error && <Loading />}
                {status && tab === 'overview' && <OverviewTab status={status} />}
                {status && tab === 'import' && <ImportTab status={status} />}
                {status && tab === 'furniture' && <FurnitureTab canManage={status.canManage} />}
                {status && tab === 'history' && <HistoryTab canManage={status.canManage} />}
            </PageBody>
        </>
    );
};
