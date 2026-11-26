import { X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { type SanctionLogEntry, type SanctionLogFilter, useSanctionLog } from '#/api/sanctions';
import { ListToolbar } from '#/components/ListToolbar';
import { LogFilters } from '#/components/LogFilters';
import { PhoneLabel, Row, RowList, WhenCell } from '#/components/RowList';
import { SearchInput } from '#/components/SearchInput';
import { Ago, Badge, Button, EmptyState, ErrorNotice, Loading, PageBody, PageHeader, Panel, Select } from '#/components/ui';
import { useHubTabs } from '#/layout/nav';
import { cx } from '#/lib/cx';
import { type ListOrder, listQuery, orderOf, pageOf, type Sorting } from '#/lib/sort';
import { formatDateTime } from '#/lib/time';

const NO_FILTER: SanctionLogFilter = { player: '', kind: '', active: '' };

const filterOf = (params: URLSearchParams): SanctionLogFilter => ({
    player: params.get('player') ?? '',
    kind: params.get('kind') ?? '',
    active: params.get('active') ?? '',
});

/** A player named on a sanction, with a way to their page; one who is gone by their id, the console by name. */
const PlayerName = ({ id, name, console: byConsole }: { id: number | null; name: string | null; console?: boolean }) => {
    if (id === null)
        return <span className="text-muted">{byConsole ? 'the console' : 'nobody'}</span>;

    return name
        ? <Link to={`/players/${id}`} className="font-medium hover:text-accent">{name}</Link>
        : <span className="text-muted">player #{id}</span>;
};

/** Whether it holds now, and if not why not: lifted, or run out (a caution is over once given). */
const State = ({ entry }: { entry: SanctionLogEntry }) =>
    entry.isActive
        ? <Badge tone="red">in force</Badge>
        : entry.revokedUtc
            ? <Badge>lifted</Badge>
            : <Badge>over</Badge>;

/** Until when it holds, or when and by whom it was lifted: a line under its kind. */
const Term = ({ entry }: { entry: SanctionLogEntry }) => {
    if (entry.revokedUtc)
        return (
            <span className="block text-xs text-muted">
                lifted <Ago at={entry.revokedUtc} />
                {entry.revokedById !== null && <> by <PlayerName id={entry.revokedById} name={entry.revokedByName} /></>}
            </span>
        );

    if (entry.kind === 'Caution')
        return null;

    return (
        <span className="block text-xs text-muted">
            {entry.expiresUtc
                ? <span title={formatDateTime(entry.expiresUtc)}>{entry.isActive ? 'until ' : 'ended '}<Ago at={entry.expiresUtc} /></span>
                : 'for good'}
        </span>
    );
};

/**
 * Every ban and caution the hotel has given, newest first: on whom, why, by whom, until when, and
 * whether it holds now. Narrowed to a player (name or id), a kind, or those in force. The filter,
 * the page and the order live in the address, so a player's page links straight to theirs. A
 * mute and a trade lock are not here: they are permission changes, in the permission log.
 */
export const SanctionsLogPage = () => {
    const tabs = useHubTabs('logs');
    const [ params, setParams ] = useSearchParams();
    const filter = filterOf(params);
    const page = pageOf(params);
    const order = orderOf(params);
    const [ draft, setDraft ] = useState(filter.player);
    const log = useSanctionLog(filter, page, order);
    const filtered = Object.values(filter).some(x => x !== '');
    const entries = log.data?.entries ?? [];
    const pageSize = log.data?.pageSize ?? 1;

    /** Another filter, page or order. */
    const go = (next: Partial<SanctionLogFilter>, nextPage = 1, nextOrder: ListOrder | null = order) =>
        setParams(listQuery({ ...filter, ...next }, nextPage, nextOrder));

    const sorting: Sorting = { order: order ?? log.data?.order, onSort: next => go({}, 1, next) };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        go({ player: draft.trim() });
    };

    const clear = () => {
        setDraft('');
        setParams(listQuery(NO_FILTER, 1, order));
    };

    return (
        <>
            <PageHeader title="Logs" tabs={tabs} description={log.data && `${log.data.total.toLocaleString()}${log.data.totalCapped ? '+' : ''} ${log.data.total === 1 ? 'sanction' : 'sanctions'}${filtered ? ' matching' : ''}`} />
            <PageBody>
                <Panel className="overflow-clip">
                    <ListToolbar
                        watch={[ filter.player, filter.kind, filter.active, page, order ]}
                        page={{
                            offset: (page - 1) * pageSize,
                            limit: pageSize,
                            total: log.data?.total,
                            capped: log.data?.totalCapped,
                            onChange: offset => go({}, Math.floor(offset / pageSize) + 1),
                        }}
                    >
                        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <SearchInput
                                value={draft}
                                onValueChange={setDraft}
                                placeholder="Player name or id"
                                aria-label="Player"
                                enterKeyHint="search"
                                className="min-w-40 flex-1 sm:max-w-56"
                            />
                            <LogFilters active={[ filter.kind, filter.active ].filter(x => x !== '').length}>
                                <Select value={filter.kind} onChange={event => go({ kind: event.target.value })} aria-label="Kind">
                                    <option value="">Bans and cautions</option>
                                    <option value="ban">Bans</option>
                                    <option value="caution">Cautions</option>
                                </Select>
                                <Select value={filter.active} onChange={event => go({ active: event.target.value })} aria-label="In force">
                                    <option value="">In force or not</option>
                                    <option value="true">In force now</option>
                                    <option value="false">Over or lifted</option>
                                </Select>
                                <Button type="submit">Search</Button>
                                {filtered && <Button type="button" variant="ghost" icon={<X />} onClick={clear}>Clear</Button>}
                            </LogFilters>
                        </form>
                    </ListToolbar>

                    {log.error && <div className="p-4"><ErrorNotice error={log.error} /></div>}
                    {log.isPending && <Loading />}
                    {log.data && (
                        entries.length === 0
                            ? <EmptyState>{filtered ? 'No sanction matches.' : 'Nobody has been banned or cautioned yet.'}</EmptyState>
                            : (
                                    <div className={cx('transition-opacity', log.isFetching && 'opacity-60')}>
                                        <RowList
                                            columns="max-content minmax(0,10rem) minmax(0,11rem) minmax(0,1fr) minmax(0,9rem)"
                                            headers={[ { label: 'When', sort: 'when', first: 'desc' }, { label: 'Player' }, { label: 'Sanction' }, { label: 'Reason' }, { label: 'Given by' } ]}
                                            sorting={sorting}
                                        >
                                            {entries.map(entry => (
                                                <Row key={entry.id}>
                                                    <WhenCell at={entry.issuedUtc} />
                                                    <span className="truncate"><PlayerName id={entry.playerId} name={entry.playerName} /></span>
                                                    <span className="min-w-0">
                                                        <span className="flex flex-wrap items-center gap-1.5">
                                                            <Badge tone="amber">{entry.kind.toLowerCase()}</Badge>
                                                            <State entry={entry} />
                                                        </span>
                                                        <Term entry={entry} />
                                                    </span>
                                                    <span className="min-w-0 text-pretty max-sm:basis-full">{entry.reason}</span>
                                                    <span className="truncate text-muted max-sm:text-xs">
                                                        <PhoneLabel>by </PhoneLabel>
                                                        <PlayerName id={entry.issuerId} name={entry.issuerName} console />
                                                    </span>
                                                </Row>
                                            ))}
                                        </RowList>
                                    </div>
                                )
                    )}
                </Panel>
            </PageBody>
        </>
    );
};
