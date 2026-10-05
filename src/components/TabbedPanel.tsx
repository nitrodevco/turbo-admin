import { type ReactNode, useId, useState } from 'react';

import { cx } from '#/lib/cx';

import { Tabs } from './Tabs';

export interface Tab {
    id: string;
    label: string;
    /** Shown beside the label, e.g. how many items the tab holds. */
    count?: number;
    content: ReactNode;
}

/** A card whose header is a row of tabs, each switching the card's content. */
export const TabbedPanel = ({ tabs, className }: { tabs: Tab[]; className?: string }) => {
    const [ selected, setSelected ] = useState(tabs[0]?.id);
    const baseId = useId();
    const current = tabs.find(tab => tab.id === selected) ?? tabs[0];

    return (
        <section className={cx('rounded-xl border border-line bg-surface', className)}>
            <Tabs
                value={current?.id}
                onChange={setSelected}
                tabs={tabs.map(tab => ({ value: tab.id, label: tab.label, count: tab.count }))}
                ids={{ tab: id => `${baseId}-tab-${id}`, panel: id => `${baseId}-panel-${id}` }}
                className="px-2"
            />
            {current && (
                <div role="tabpanel" id={`${baseId}-panel-${current.id}`} aria-labelledby={`${baseId}-tab-${current.id}`}>
                    {current.content}
                </div>
            )}
        </section>
    );
};
