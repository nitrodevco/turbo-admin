import { Link2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button, EmptyState, IconButton, Input, Panel } from '#/components/ui';
import { cx } from '#/lib/cx';

import type { HotelViewDraft } from './draft';
import { PREFIX } from './model';
import { Changed } from './parts';

const isJson = (value: string) => {
    try {
        JSON.parse(value);

        return true;
    } catch {
        return false;
    }
};

/** One variable's JSON: what is typed is kept while it is being typed, and taken whenever it is JSON. */
const RawValue = ({ variableKey, draft, disabled }: { variableKey: string; draft: HotelViewDraft; disabled?: boolean }) => {
    const [ typed, setTyped ] = useState<string | null>(null);
    const value = typed ?? draft.json(variableKey) ?? '';

    return (
        <Input
            value={value}
            onChange={(event) => {
                setTyped(event.target.value);

                if (isJson(event.target.value)) draft.setJson(variableKey, event.target.value);
            }}
            onBlur={() => setTyped(null)}
            className={cx('w-full font-mono text-xs', !isJson(value) && 'border-warn')}
            disabled={disabled}
            spellCheck={false}
            aria-label={variableKey}
        />
    );
};

/**
 * Every `landing.view.*` variable as JSON, for what the other tabs have no form for (Habbo's
 * campaign keys, widgets Nitro doesn't draw yet). Changes here are saved with the rest.
 */
export const AllTab = ({ draft, disabled }: { draft: HotelViewDraft; disabled?: boolean }) => {
    const [ filter, setFilter ] = useState('');
    const [ adding, setAdding ] = useState(PREFIX);
    const words = filter.trim().toLowerCase();
    const keys = draft.keys.filter(key => !words || key.toLowerCase().includes(words) || (draft.json(key) ?? '').toLowerCase().includes(words));
    const addProblem = !adding.startsWith(PREFIX) || adding.length === PREFIX.length || draft.keys.includes(adding.trim());

    return (
        <Panel className="overflow-clip">
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
                <Input type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Key or value" aria-label="Find variables" className="min-w-48 flex-1 sm:max-w-96" />
                <span className="text-xs text-muted">{keys.length} of {draft.keys.length}</span>
                {!disabled && (
                    <form
                        className="ml-auto flex min-w-0 gap-2"
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (addProblem) return;

                            draft.setJson(adding.trim(), '""');
                            setFilter(adding.trim());
                            setAdding(PREFIX);
                        }}
                    >
                        <Input value={adding} onChange={event => setAdding(event.target.value)} aria-label="New variable's key" className="w-72 min-w-0 font-mono text-xs" />
                        <Button type="submit" variant="secondary" icon={<Plus />} disabled={addProblem}>Add</Button>
                    </form>
                )}
            </div>
            {keys.length === 0 && <EmptyState>{draft.keys.length === 0 ? 'The hotel has no hotel view variables yet.' : 'No variable has those words.'}</EmptyState>}
            <ul className="divide-y divide-line">
                {keys.map(key => (
                    <li key={key} className="grid items-center gap-x-3 gap-y-1 px-4 py-2 sm:grid-cols-[minmax(14rem,24rem)_1fr_auto]">
                        <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-mono text-[13px]" title={key}>{key.slice(PREFIX.length)}</span>
                            <Changed on={draft.changed(key)} />
                            {draft.follows(key) && !draft.changed(key) && <Badge tone="accent" className="max-w-40 truncate"><Link2 className="size-3" /> {draft.follows(key)}</Badge>}
                        </span>
                        <RawValue variableKey={key} draft={draft} disabled={disabled} />
                        {!disabled && <IconButton label="Remove" icon={<Trash2 />} tone="bad" onClick={() => draft.setJson(key, null)} />}
                    </li>
                ))}
            </ul>
        </Panel>
    );
};
