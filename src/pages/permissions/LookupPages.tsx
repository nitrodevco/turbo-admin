import { Search } from 'lucide-react';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { useCatalog, useHolders, useLog } from '#/api/permissions';
import { ListToolbar } from '#/components/ListToolbar';
import { Badge, Button, EmptyState, ErrorNotice, Input, Loading, PageBody, Panel, Td, Th } from '#/components/ui';

import { AuditTable, Expiry, PermissionsHeader, Verdict } from './common';
import { targetLink } from './links';

/** Rows shown at once in the lists paged here, which the server sends whole. */
const PAGE_SIZE = 25;

const SearchBox = ({ value, onChange, placeholder, list }: { value: string; onChange: (value: string) => void; placeholder: string; list?: string }) => (
    <div className="relative min-w-48 flex-1 sm:max-w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input
            type="search"
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            list={list}
            spellCheck={false}
            autoComplete="off"
            className="w-full pl-9"
        />
    </div>
);

/** Every group and player given a node, exactly or by a wildcard that covers it. */
export const SearchPage = () => {
    const [ params, setParams ] = useSearchParams();
    const node = params.get('node') ?? '';
    const [ draft, setDraft ] = useState(node);
    const holders = useHolders(node);
    const catalog = useCatalog();
    const listId = useId();

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setParams({ node: draft.trim() });
    };

    return (
        <>
            <PermissionsHeader section="search" description="Who is given a node, exactly or by wildcard; not who ends up holding it" />
            <PageBody>
                <Panel className="overflow-clip">
                    <ListToolbar watch={[ node ]}>
                        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 gap-2">
                            <SearchBox value={draft} onChange={setDraft} placeholder="A node, like room.enter.locked" list={listId} />
                            <datalist id={listId}>
                                {catalog.data?.nodes.map(x => <option key={x.node} value={x.node}>{x.description}</option>)}
                            </datalist>
                            <Button type="submit" disabled={draft.trim() === ''}>Search</Button>
                        </form>
                    </ListToolbar>
                    {node === '' && <p className="px-4 py-6 text-sm text-muted">Name a node to see every group and player given it.</p>}
                    {holders.error && <div className="p-4"><ErrorNotice error={holders.error} /></div>}
                    {holders.isFetching && !holders.data && <Loading />}
                    {holders.data && (
                        <>
                            {holders.data.length === 0
                                ? <EmptyState>Nobody is given {node}, directly or by wildcard.</EmptyState>
                                : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr>
                                                        <Th>Given to</Th>
                                                        <Th>As</Th>
                                                        <Th>Value</Th>
                                                    </tr>
                                                </thead>
                                                <tbody className="[&>tr:last-child>td]:border-b-0">
                                                    {holders.data.map(holder => (
                                                        <tr key={`${holder.targetType}|${holder.targetId}|${holder.node}|${holder.expiresAtUtc ?? ''}`} className="hover:bg-subtle/60">
                                                            <Td>
                                                                <span className="mr-1.5 text-xs text-muted">{holder.targetType === 'Group' ? 'group' : 'player'}</span>
                                                                <Link to={targetLink(holder.targetType, holder.targetId, holder.targetName)} className="font-medium hover:text-accent">
                                                                    {holder.targetName}
                                                                </Link>
                                                            </Td>
                                                            <Td><code className="font-mono text-xs">{holder.node}</code></Td>
                                                            <Td>
                                                                <span className="inline-flex flex-wrap items-center gap-1.5">
                                                                    <Verdict value={holder.value} />
                                                                    <Expiry at={holder.expiresAtUtc} />
                                                                </span>
                                                            </Td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                        </>
                    )}
                </Panel>
            </PageBody>
        </>
    );
};

/** Recent changes to anyone's permissions, newest first. */
export const LogPage = () => {
    const [ params, setParams ] = useSearchParams();
    const search = params.get('search') ?? '';
    const [ draft, setDraft ] = useState(search);
    const [ offset, setOffset ] = useState(0);
    const log = useLog(search);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setOffset(0);
        setParams(draft.trim() ? { search: draft.trim() } : {});
    };

    return (
        <>
            <PermissionsHeader section="log" description="Every change to a group or a player's permissions, and who made it" />
            <PageBody>
                <Panel className="overflow-clip">
                    <ListToolbar
                        watch={[ search, offset ]}
                        page={{ offset, limit: PAGE_SIZE, total: log.data?.length, onChange: setOffset }}
                    >
                        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 gap-2">
                            <SearchBox value={draft} onChange={setDraft} placeholder="Node, key or group name" />
                            <Button type="submit" variant="secondary">Search</Button>
                        </form>
                    </ListToolbar>
                    {log.error && <div className="p-4"><ErrorNotice error={log.error} /></div>}
                    {log.isPending && <Loading />}
                    {log.data && <AuditTable entries={log.data.slice(offset, offset + PAGE_SIZE)} />}
                </Panel>
            </PageBody>
        </>
    );
};

/** Every registered node and meta key: what exists to be granted. */
export const NodesPage = () => {
    const catalog = useCatalog();
    const [ filter, setFilter ] = useState('');
    const [ offset, setOffset ] = useState(0);
    const nodes = useMemo(() => {
        const needle = filter.trim().toLowerCase();

        return (catalog.data?.nodes ?? []).filter(x => x.node.includes(needle) || x.description.toLowerCase().includes(needle));
    }, [ catalog.data, filter ]);

    return (
        <>
            <PermissionsHeader
                section="nodes"
                description={catalog.data ? `${catalog.data.nodes.length} nodes and ${catalog.data.metaKeys.length} meta keys are registered` : 'What exists to be granted'}
            />
            <PageBody className="grid gap-5 xl:grid-cols-[1fr_22rem]">
                <div className="min-w-0">
                    <Panel className="overflow-clip">
                        <ListToolbar
                            watch={[ filter, offset ]}
                            page={{ offset, limit: PAGE_SIZE, total: catalog.data ? nodes.length : undefined, onChange: setOffset }}
                        >
                            <SearchBox
                                value={filter}
                                onChange={(value) => {
                                    setFilter(value);
                                    setOffset(0);
                                }}
                                placeholder="Filter nodes"
                            />
                        </ListToolbar>
                        {catalog.error && <div className="p-4"><ErrorNotice error={catalog.error} /></div>}
                        {catalog.isPending && <Loading />}
                        {catalog.data && (
                            <>
                                {nodes.length === 0
                                    ? <EmptyState>No node matches.</EmptyState>
                                    : (
                                            <ul className="divide-y divide-line text-sm">
                                                {nodes.slice(offset, offset + PAGE_SIZE).map(node => (
                                                    <li key={node.node} className="flex flex-wrap items-start justify-between gap-2 px-4 py-2.5">
                                                        <div className="min-w-0">
                                                            <Link to={`/permissions/search?node=${encodeURIComponent(node.node)}`} className="font-mono text-xs hover:text-accent" title="Who is given it">
                                                                {node.node}
                                                            </Link>
                                                            <div className="text-xs text-muted">{node.description}</div>
                                                        </div>
                                                        <span className="flex shrink-0 gap-1.5">
                                                            {node.grantedByDefault && <Badge tone="green">everyone</Badge>}
                                                            {node.clientLevel !== null && <Badge tone="accent">level {node.clientLevel}</Badge>}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                            </>
                        )}
                    </Panel>
                </div>
                {catalog.data && (
                    <Panel title="Meta keys" description="Values a group or player may carry." className="self-start">
                        <ul className="divide-y divide-line text-sm">
                            {catalog.data.metaKeys.map(key => (
                                <li key={key.key} className="px-4 py-2.5">
                                    <code className="font-mono text-xs">{key.key}</code>
                                    <span className="ml-2 text-xs text-muted">{key.selection}</span>
                                    <div className="text-xs text-muted">{key.description}</div>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                )}
            </PageBody>
        </>
    );
};
