import { ChevronDown, ChevronRight, Undo2 } from 'lucide-react';
import { useState } from 'react';

import { CHANGE_KINDS, type ChangeSet, RECORD_TYPES, useChanges, useHistory, useRollback } from '#/api/gamedata';
import { Badge, type BadgeTone, Button, EmptyState, ErrorNotice, Loading, Panel, SuccessNotice, WarningNotice } from '#/components/ui';
import { fromNow } from '#/lib/time';

import { showValue } from './labels';

const KIND_TONES: Record<string, BadgeTone> = { import: 'accent', edit: 'green', rollback: 'amber' };

/** A change's fields, before and after, from the JSON objects the server keeps. */
const fieldsOf = (before: string | null, after: string | null) => {
    const parse = (json: string | null) => {
        if (!json)
            return {} as Record<string, unknown>;

        try {
            return JSON.parse(json) as Record<string, unknown>;
        } catch {
            return {} as Record<string, unknown>;
        }
    };

    const was = parse(before);
    const now = parse(after);

    return [ ...new Set([ ...Object.keys(was), ...Object.keys(now) ]) ].map(key => ({
        key,
        before: key in was ? JSON.stringify(was[key]) : null,
        after: key in now ? JSON.stringify(now[key]) : null,
    }));
};

const Changes = ({ set }: { set: ChangeSet }) => {
    const { data: changes, error } = useChanges(set.id);

    if (error)
        return <div className="p-4"><ErrorNotice error={error} /></div>;

    if (!changes)
        return <Loading />;

    // Habbo's items are the base the next import compares with; they say little to people.
    const shown = changes.filter(change => change.recordType === 0);

    if (shown.length === 0)
        return <EmptyState>Only Habbo's items as they were taken in changed.</EmptyState>;

    return (
        <ul className="divide-y divide-line border-t border-line bg-canvas/40">
            {shown.map(change => (
                <li key={`${change.recordType}:${change.recordId}:${change.label}`} className="px-6 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{change.label}</span>
                        <span className="text-xs text-muted">{RECORD_TYPES[change.recordType]} #{change.recordId}</span>
                        {change.before === null && <Badge tone="green">made</Badge>}
                        {change.after === null && <Badge tone="red">removed</Badge>}
                    </div>
                    {change.before !== null && change.after !== null && (
                        <ul className="mt-1 font-mono text-xs text-muted">
                            {fieldsOf(change.before, change.after).map(field => (
                                <li key={field.key}>{field.key}: {showValue(field.before)} → {showValue(field.after)}</li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
};

/** Every gamedata change, newest first; a set opens to its changes and rolls back as a whole. */
export const HistoryTab = ({ canManage }: { canManage: boolean }) => {
    const [ page, setPage ] = useState(0);
    const [ open, setOpen ] = useState<number | null>(null);
    const { data: sets, error } = useHistory(page);
    const rollback = useRollback();

    if (error)
        return <ErrorNotice error={error} />;

    if (!sets)
        return <Loading />;

    return (
        <Panel
            title="History"
            description="Imports, edits and rollbacks. Rolling back leaves anything changed again since as it is."
            actions={(
                <>
                    <Button variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Newer</Button>
                    <Button variant="ghost" disabled={sets.length === 0} onClick={() => setPage(page + 1)}>Older</Button>
                </>
            )}
        >
            {rollback.error && <div className="p-4"><ErrorNotice error={rollback.error} /></div>}
            {rollback.data && (
                <div className="flex flex-col gap-2 p-4">
                    <SuccessNotice>{rollback.data.changeSet.summary}</SuccessNotice>
                    {rollback.data.skipped.length > 0 && (
                        <WarningNotice>
                            Left as they are: {rollback.data.skipped.join(' ')}
                        </WarningNotice>
                    )}
                </div>
            )}
            {sets.length === 0 && <EmptyState>{page === 0 ? 'No gamedata changes yet.' : 'Nothing older.'}</EmptyState>}
            <ul className="divide-y divide-line">
                {sets.map((set) => {
                    const kind = CHANGE_KINDS[set.kind] ?? String(set.kind);
                    const canRollBack = canManage && kind !== 'rollback' && set.rolledBackById === null;

                    return (
                        <li key={set.id}>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                                <button
                                    type="button"
                                    onClick={() => setOpen(open === set.id ? null : set.id)}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted"
                                >
                                    {open === set.id ? <ChevronDown /> : <ChevronRight />}
                                    <Badge tone={KIND_TONES[kind] ?? 'neutral'}>{kind}</Badge>
                                    <span className="truncate">{set.summary}</span>
                                </button>
                                <span className="text-xs text-muted">#{set.id}, {set.changeCount} rows, {fromNow(set.createdAt)}</span>
                                {set.rolledBackById !== null && <Badge tone="amber">rolled back by #{set.rolledBackById}</Badge>}
                                {canRollBack && (
                                    <Button
                                        variant="secondary"
                                        icon={<Undo2 />}
                                        disabled={rollback.isPending}
                                        onClick={() => {
                                            if (window.confirm(`Roll back #${set.id}? ${set.summary}`))
                                                rollback.mutate(set.id);
                                        }}
                                    >
                                        Roll back
                                    </Button>
                                )}
                            </div>
                            {open === set.id && <Changes set={set} />}
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
};
