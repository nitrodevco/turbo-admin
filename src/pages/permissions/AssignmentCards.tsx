import { Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { type MetaAssignment, type NodeAssignment, type Target, targetCalls, useCatalog, usePermissionChange } from '#/api/permissions';
import { Button, EmptyState, ErrorNotice, Input, Panel, Select, Td, Th } from '#/components/ui';

import { Expiry, TimingFields, Verdict } from './common';

/** The answer to the last change: an error, or the server's word that nothing changed. */
const Outcome = ({ error, message }: { error: unknown; message: string | null }) => (
    <>
        {error !== null && error !== undefined && <div className="px-4 pb-3"><ErrorNotice error={error} /></div>}
        {message && <p className="px-4 pb-3 text-xs text-muted">{message}</p>}
    </>
);

/** Every registered node, and a wildcard for each prefix of one, for the node box to suggest. */
const useNodeSuggestions = () => {
    const catalog = useCatalog();

    return useMemo(() => {
        const nodes = catalog.data?.nodes ?? [];
        const wildcards = new Set<string>([ '*' ]);

        for (const { node } of nodes) {
            const parts = node.split('.');

            for (let index = 1; index < parts.length; index++)
                wildcards.add(`${parts.slice(0, index).join('.')}.*`);
        }

        return [ ...nodes.map(x => ({ value: x.node, label: x.description })), ...[ ...wildcards ].sort().map(x => ({ value: x, label: 'wildcard' })) ];
    }, [ catalog.data ]);
};

/**
 * The nodes set on a group or player, and, for an editor, granting, denying and unsetting them.
 * A temporary and a permanent assignment of one node are separate rows; removing says which.
 */
export const NodesCard = ({ target, nodes, canEdit }: { target: Target; nodes: NodeAssignment[]; canEdit: boolean }) => {
    const calls = targetCalls(target);
    const set = usePermissionChange(calls.setNode);
    const unset = usePermissionChange(calls.unsetNode);
    const suggestions = useNodeSuggestions();
    const listId = useId();
    const [ node, setNode ] = useState('');
    const [ value, setValue ] = useState(true);
    const [ duration, setDuration ] = useState('');
    const [ extend, setExtend ] = useState(false);
    const [ message, setMessage ] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setMessage(null);
        unset.reset();
        set.mutate([ node.trim(), value, { duration, extend } ], {
            onSuccess: (response) => {
                setMessage(response.changed ? null : response.message);

                if (response.changed)
                    setNode('');
            },
        });
    };

    const handleRemove = (assignment: NodeAssignment) => {
        setMessage(null);
        set.reset();
        unset.mutate([ assignment.node, assignment.expiresAtUtc !== null ]);
    };

    return (
        <Panel
            title={`Nodes (${nodes.length})`}
            description="Set here directly. A denial beats a grant at the same place; an exact node beats a wildcard."
            className="overflow-hidden"
        >
            {nodes.length === 0
                ? <EmptyState>No nodes are set here.</EmptyState>
                : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <Th>Node</Th>
                                        <Th>Value</Th>
                                        {canEdit && <Th className="w-0" />}
                                    </tr>
                                </thead>
                                <tbody className="[&>tr:last-child>td]:border-b-0">
                                    {nodes.map(assignment => (
                                        <tr key={`${assignment.node}|${assignment.expiresAtUtc ?? ''}`} className="hover:bg-subtle/60">
                                            <Td>
                                                {assignment.node.endsWith('*')
                                                    ? <code className="font-mono text-xs">{assignment.node}</code>
                                                    : (
                                                            <Link
                                                                to={`/permissions/search?node=${encodeURIComponent(assignment.node)}`}
                                                                className="font-mono text-xs hover:text-accent"
                                                                title="Who else is given it"
                                                            >
                                                                {assignment.node}
                                                            </Link>
                                                        )}
                                                {assignment.description && <div className="text-xs text-muted">{assignment.description}</div>}
                                            </Td>
                                            <Td className="whitespace-nowrap">
                                                <span className="inline-flex flex-wrap items-center gap-1.5">
                                                    <Verdict value={assignment.value} />
                                                    <Expiry at={assignment.expiresAtUtc} />
                                                </span>
                                            </Td>
                                            {canEdit && (
                                                <Td>
                                                    <Button
                                                        variant="ghost"
                                                        icon={<Trash2 />}
                                                        aria-label={`Unset ${assignment.node}`}
                                                        title="Unset"
                                                        disabled={unset.isPending}
                                                        onClick={() => handleRemove(assignment)}
                                                        className="h-7 px-2"
                                                    />
                                                </Td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
            {canEdit && (
                <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 border-t border-line p-4">
                    <Input
                        value={node}
                        onChange={event => setNode(event.target.value)}
                        list={listId}
                        placeholder="room.enter.locked, room.*"
                        aria-label="Node"
                        spellCheck={false}
                        autoComplete="off"
                        className="min-w-48 flex-1 font-mono"
                    />
                    <datalist id={listId}>
                        {suggestions.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                    </datalist>
                    <Select value={value ? 'grant' : 'deny'} onChange={event => setValue(event.target.value === 'grant')} aria-label="Grant or deny">
                        <option value="grant">Grant</option>
                        <option value="deny">Deny</option>
                    </Select>
                    <TimingFields duration={duration} extend={extend} onDuration={setDuration} onExtend={setExtend} />
                    <Button type="submit" icon={<Plus />} disabled={set.isPending || node.trim() === ''}>Set</Button>
                </form>
            )}
            <Outcome error={set.error ?? unset.error} message={message} />
        </Panel>
    );
};

/** The meta values set on a group or player: limits, the client level, a plugin's settings. */
export const MetaCard = ({ target, meta, canEdit }: { target: Target; meta: MetaAssignment[]; canEdit: boolean }) => {
    const calls = targetCalls(target);
    const set = usePermissionChange(calls.setMeta);
    const unset = usePermissionChange(calls.unsetMeta);
    const catalog = useCatalog();
    const listId = useId();
    const [ key, setKey ] = useState('');
    const [ value, setValue ] = useState('');
    const [ duration, setDuration ] = useState('');
    const [ extend, setExtend ] = useState(false);
    const [ message, setMessage ] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setMessage(null);
        unset.reset();
        set.mutate([ key.trim(), value.trim(), { duration, extend } ], {
            onSuccess: (response) => {
                setMessage(response.changed ? null : response.message);

                if (response.changed) {
                    setKey('');
                    setValue('');
                }
            },
        });
    };

    return (
        <Panel title={`Meta (${meta.length})`} description="Values rather than yes or no: limits, the client level." className="overflow-hidden">
            {meta.length === 0
                ? <EmptyState>No meta is set here.</EmptyState>
                : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <Th>Key</Th>
                                        <Th>Value</Th>
                                        {canEdit && <Th className="w-0" />}
                                    </tr>
                                </thead>
                                <tbody className="[&>tr:last-child>td]:border-b-0">
                                    {meta.map(assignment => (
                                        <tr key={`${assignment.key}|${assignment.expiresAtUtc ?? ''}`} className="hover:bg-subtle/60">
                                            <Td>
                                                <code className="font-mono text-xs">{assignment.key}</code>
                                                {assignment.description && <div className="text-xs text-muted">{assignment.description}</div>}
                                            </Td>
                                            <Td>
                                                <span className="inline-flex flex-wrap items-center gap-1.5">
                                                    <code className="font-mono text-xs">{assignment.value}</code>
                                                    <Expiry at={assignment.expiresAtUtc} />
                                                </span>
                                            </Td>
                                            {canEdit && (
                                                <Td>
                                                    <Button
                                                        variant="ghost"
                                                        icon={<Trash2 />}
                                                        aria-label={`Unset ${assignment.key}`}
                                                        title="Unset"
                                                        disabled={unset.isPending}
                                                        onClick={() => {
                                                            setMessage(null);
                                                            set.reset();
                                                            unset.mutate([ assignment.key, assignment.expiresAtUtc !== null ]);
                                                        }}
                                                        className="h-7 px-2"
                                                    />
                                                </Td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
            {canEdit && (
                <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 border-t border-line p-4">
                    <Input
                        value={key}
                        onChange={event => setKey(event.target.value)}
                        list={listId}
                        placeholder="limit.rooms"
                        aria-label="Key"
                        spellCheck={false}
                        autoComplete="off"
                        className="min-w-36 flex-1 font-mono"
                    />
                    <datalist id={listId}>
                        {catalog.data?.metaKeys.map(x => <option key={x.key} value={x.key}>{x.description}</option>)}
                    </datalist>
                    <Input value={value} onChange={event => setValue(event.target.value)} placeholder="Value" aria-label="Value" className="w-28" />
                    <TimingFields duration={duration} extend={extend} onDuration={setDuration} onExtend={setExtend} />
                    <Button type="submit" icon={<Plus />} disabled={set.isPending || key.trim() === '' || value.trim() === ''}>Set</Button>
                </form>
            )}
            <Outcome error={set.error ?? unset.error} message={message} />
        </Panel>
    );
};
