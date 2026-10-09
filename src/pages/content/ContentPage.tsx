import { useSearchParams } from 'react-router';

import { useAchievements } from '#/api/content';
import { PageBody, PageHeader } from '#/components/ui';

import { AchievementsTab } from './AchievementsTab';
import { BadgesTab } from './BadgesTab';

const TABS = [
    { value: 'achievements', label: 'Achievements' },
    { value: 'badges', label: 'Badges' },
];

/**
 * The game's content: what players earn, wear and find - achievements and badges. Each change is
 * made at once and is on record.
 */
export const ContentPage = () => {
    const [ params, setParams ] = useSearchParams();
    const tab = TABS.some(x => x.value === params.get('tab')) ? params.get('tab')! : 'achievements';
    // Whether the staff member may change the content: the achievements' answer says.
    const canManage = useAchievements().data?.canManage ?? false;

    return (
        <>
            <PageHeader
                title="Content"
                description="Achievements and badges"
                tabs={{ items: TABS, value: tab, onChange: value => setParams({ tab: value }, { replace: true }) }}
            />
            <PageBody className="flex flex-col gap-4 lg:gap-5">
                {tab === 'achievements' && <AchievementsTab />}
                {tab === 'badges' && <BadgesTab canManage={canManage} />}
            </PageBody>
        </>
    );
};
