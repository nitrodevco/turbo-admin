import { useSearchParams } from 'react-router';

import { useAssetJob, useAssetsStatus } from '#/api/bundles';
import { ErrorNotice, Loading, PageBody, PageHeader } from '#/components/ui';

import { BundlesTab } from './BundlesTab';
import { JobPanel } from './JobPanel';
import { OverviewTab } from './OverviewTab';
import { PublishTab } from './PublishTab';

const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'bundles', label: 'Bundles' },
    { value: 'publish', label: 'Publish' },
];

/**
 * The bundles the client draws furniture, effects and pets from: taken from Habbo by a sync,
 * checked against the hotel, and published to where the client loads them. A sync or a publish
 * that runs shows at the top of every tab.
 */
export const AssetsPage = () => {
    const [ params, setParams ] = useSearchParams();
    const tab = TABS.some(x => x.value === params.get('tab')) ? params.get('tab')! : 'overview';
    const { data: status, error } = useAssetsStatus();
    const { data: job } = useAssetJob();
    const running = job?.status === 'running';
    const total = status?.kinds.reduce((sum, kind) => sum + kind.bundles, 0);
    // A check's link opens the bundles with its own filter, which starts the list over.
    const found = [ params.get('kind'), params.get('status'), params.get('q') ].join('|');

    return (
        <>
            <PageHeader
                title="Assets"
                description="The furniture, effect and pet bundles the client loads, taken from Habbo and published to your asset host"
                tabs={{
                    items: TABS.map(x => (x.value === 'bundles' && total !== undefined ? { ...x, count: total } : x)),
                    value: tab,
                    onChange: value => setParams({ tab: value }, { replace: true }),
                }}
            />
            <PageBody className="flex flex-col gap-4 lg:gap-5">
                {error && <ErrorNotice error={error} />}
                {!status && !error && <Loading />}
                {status && running && tab !== 'overview' && <JobPanel job={job} canManage={status.canManage} compact />}
                {status && tab === 'overview' && <OverviewTab status={status} job={job ?? status.job} />}
                {status && tab === 'bundles' && <BundlesTab key={found} status={status} />}
                {status && tab === 'publish' && <PublishTab canManage={status.canManage} busy={running} />}
            </PageBody>
        </>
    );
};
