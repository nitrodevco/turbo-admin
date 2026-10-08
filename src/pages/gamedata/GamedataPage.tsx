import { useSearchParams } from 'react-router';

import { useGamedataStatus } from '#/api/gamedata';
import { ErrorNotice, Loading, PageBody, PageHeader } from '#/components/ui';

import { FiguresTab } from './FiguresTab';
import { FurnitureTab } from './FurnitureTab';
import { HistoryTab } from './HistoryTab';
import { OverviewTab } from './OverviewTab';
import { ProductsTab } from './ProductsTab';
import { TextsTab } from './TextsTab';
import { VariablesTab } from './VariablesTab';

const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'products', label: 'Products' },
    { value: 'texts', label: 'Texts' },
    { value: 'figures', label: 'Figures' },
    { value: 'variables', label: 'Variables' },
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
    // A tab opened again from the search, with something else found, starts over with it.
    const found = [ params.get('q'), params.get('id'), params.get('open') ].join('|');

    return (
        <>
            <PageHeader
                title="Gamedata"
                description="FurnitureData, product data, the external texts, the figure data and the client's external variables, built from the database"
                tabs={{ items: TABS, value: tab, onChange: value => setParams({ tab: value }, { replace: true }) }}
            />
            <PageBody className="flex flex-col gap-4 lg:gap-5">
                {error && <ErrorNotice error={error} />}
                {!status && !error && <Loading />}
                {status && tab === 'overview' && <OverviewTab status={status} />}
                {status && tab === 'furniture' && <FurnitureTab key={found} status={status} />}
                {status && tab === 'products' && <ProductsTab key={found} status={status} />}
                {status && tab === 'texts' && <TextsTab key={found} status={status} />}
                {status && tab === 'figures' && <FiguresTab status={status} />}
                {status && tab === 'variables' && <VariablesTab key={found} status={status} />}
                {status && tab === 'history' && <HistoryTab canManage={status.canManage} />}
            </PageBody>
        </>
    );
};
