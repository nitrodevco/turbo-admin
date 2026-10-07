import { useSearchParams } from 'react-router';

import { useGamedataStatus } from '#/api/gamedata';
import { ErrorNotice, Loading, PageBody, PageHeader } from '#/components/ui';

import { FiguresTab } from './FiguresTab';
import { FurnitureTab } from './FurnitureTab';
import { HistoryTab } from './HistoryTab';
import { OverviewTab } from './OverviewTab';
import { ProductsTab } from './ProductsTab';
import { TextsTab } from './TextsTab';

const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'products', label: 'Products' },
    { value: 'texts', label: 'Texts' },
    { value: 'figures', label: 'Figures' },
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
                description="FurnitureData, product data, the external texts and the figure data, built from the database"
                tabs={{ items: TABS, value: tab, onChange: value => setParams({ tab: value }, { replace: true }) }}
            />
            <PageBody className="flex flex-col gap-4 lg:gap-5">
                {error && <ErrorNotice error={error} />}
                {!status && !error && <Loading />}
                {status && tab === 'overview' && <OverviewTab status={status} />}
                {status && tab === 'furniture' && <FurnitureTab status={status} />}
                {status && tab === 'products' && <ProductsTab status={status} />}
                {status && tab === 'texts' && <TextsTab status={status} />}
                {status && tab === 'figures' && <FiguresTab status={status} />}
                {status && tab === 'history' && <HistoryTab canManage={status.canManage} />}
            </PageBody>
        </>
    );
};
