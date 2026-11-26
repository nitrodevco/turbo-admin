import { Check, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { type PlayerListItem, type PlayerSearchMode, usePlayerAbilities, usePlayerSearch } from '#/api/players';
import { ListToolbar } from '#/components/ListToolbar';
import { SearchWithButton } from '#/components/SearchInput';
import { PhoneSort } from '#/components/SortHeader';
import { Ago, Avatar, Button, Chip, EmptyState, ErrorNotice, LiveBadge, Loading, PageBody, PageHeader, Panel, Table, Td, Th } from '#/components/ui';
import { cx } from '#/lib/cx';
import { plural } from '#/lib/plural';
import { type ListOrder, orderOf, orderParams, pageOf, type Sorting } from '#/lib/sort';

import { NewPlayerPanel } from './NewPlayerPanel';

const MODES: { value: PlayerSearchMode; label: string; placeholder: string }[] = [
    { value: 'name', label: 'Name', placeholder: 'Part of the player\'s name' },
    { value: 'id', label: 'Player id', placeholder: 'e.g. 1234' },
    { value: 'discord', label: 'Discord', placeholder: 'Discord username or id' },
];

const modeOf = (value: string | null): PlayerSearchMode =>
    MODES.some(x => x.value === value) ? (value as PlayerSearchMode) : 'name';

/** Online now, or when they were last: never, for someone who has not logged in. */
const Seen = ({ player }: { player: PlayerListItem }) =>
    player.isOnline
        ? <LiveBadge live>Online</LiveBadge>
        : <span className="text-xs text-muted">{player.lastLoginUtc ? <Ago at={player.lastLoginUtc} /> : 'never'}</span>;

/**
 * The line under a player's name: their motto, or, when the list was searched by Discord, the
 * Discord username it matched.
 */
const aboutOf = (player: PlayerListItem, by: PlayerSearchMode) =>
    (by === 'discord' && player.discordUsername ? `@${player.discordUsername}` : player.motto);

/** The columns the list sorts by, as the server names them. */
const SORT_COLUMNS = [
    { label: 'Player', sort: 'name' },
    { label: 'Seen', sort: 'seen', first: 'desc' },
    { label: 'Joined', sort: 'joined', first: 'desc' },
] as const;

/**
 * Every player, by part of their name or by id, most recently logged in first unless sorted
 * otherwise, the online ones alone when asked. The search and its order live in the address, so a
 * search can be shared, and Back from a player returns to it.
 */
export const PlayersPage = () => {
    const [ params, setParams ] = useSearchParams();
    const text = params.get('q') ?? '';
    const by = modeOf(params.get('by'));
    const online = params.get('online') === 'true';
    const page = pageOf(params);
    const order = orderOf(params);
    const [ draft, setDraft ] = useState(text);
    const [ draftBy, setDraftBy ] = useState(by);
    const search = usePlayerSearch(text, by, online, page, order);
    const canCreate = usePlayerAbilities().data?.createPlayers ?? false;
    const [ creating, setCreating ] = useState(false);

    const go = (next: { q?: string; by?: PlayerSearchMode; online?: boolean; page?: number }, nextOrder: ListOrder | null = order) =>
        setParams({ q: next.q ?? text, by: next.by ?? by, online: String(next.online ?? online), page: String(next.page ?? page), ...orderParams(nextOrder) });

    const sorting: Sorting = { order: order ?? search.data?.order, onSort: next => go({ page: 1 }, next) };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        go({ q: draft.trim(), by: draftBy, page: 1 });
    };

    const pageSize = search.data?.pageSize ?? 1;

    return (
        <>
            <PageHeader
                title="Players"
                description={search.data && `${plural(search.data.total, 'player')}${text ? ` matching "${text}"` : ''} · ${search.data.onlineNow.toLocaleString()} online now`}
            >
                {canCreate && !creating && <Button icon={<UserPlus />} onClick={() => setCreating(true)}>New player</Button>}
            </PageHeader>
            <PageBody>
                {creating && <NewPlayerPanel onClose={() => setCreating(false)} />}
                <Panel className="overflow-clip">
                    <ListToolbar
                        watch={[ text, by, online, page, order ]}
                        page={{
                            offset: (page - 1) * pageSize,
                            limit: pageSize,
                            total: search.data?.total,
                            onChange: offset => go({ page: Math.floor(offset / pageSize) + 1 }),
                        }}
                    >
                        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:w-[28rem] sm:flex-none">
                            <SearchWithButton
                                mode={{ label: 'Search by', value: draftBy, onChange: value => setDraftBy(modeOf(value)), options: MODES }}
                                value={draft}
                                onValueChange={setDraft}
                                placeholder={MODES.find(x => x.value === draftBy)?.placeholder}
                                aria-label="Search"
                                inputMode={draftBy === 'id' ? 'numeric' : undefined}
                            />
                        </form>
                        <Chip large active={online} onClick={() => go({ online: !online, page: 1 })}>
                            {online && <Check />}
                            Online only
                        </Chip>
                    </ListToolbar>

                    {search.error && <div className="p-4"><ErrorNotice error={search.error} /></div>}
                    {search.isPending && <Loading />}
                    {search.data && (
                        search.data.players.length === 0
                            ? <EmptyState>{online ? 'Nobody matching is online.' : 'No player matches.'}</EmptyState>
                            : (
                                    <div className={cx('transition-opacity', search.isFetching && 'opacity-60')}>
                                        {/* A phone: one tappable row per player. */}
                                        <PhoneSort columns={[ ...SORT_COLUMNS ]} sorting={sorting} />
                                        <ul className="sm:hidden">
                                            {search.data.players.map(player => (
                                                <li key={player.id} className="border-t border-line first:border-t-0">
                                                    <Link to={`/players/${player.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2.5 active:bg-subtle">
                                                        <Avatar id={player.id} name={player.name} figure={player.figure} />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate font-medium">{player.name}</div>
                                                            <div className="truncate text-xs text-muted">#{player.id}{aboutOf(player, by) ? ` · ${aboutOf(player, by)}` : ''}</div>
                                                        </div>
                                                        <Seen player={player} />
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                        <Table className="hidden sm:block">
                                            <thead>
                                                <tr>
                                                    <Th sort="name" sorting={sorting}>Player</Th>
                                                    <Th sort="seen" first="desc" sorting={sorting}>Seen</Th>
                                                    <Th sort="joined" first="desc" sorting={sorting}>Joined</Th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {search.data.players.map(player => (
                                                    <tr key={player.id} className="hover:bg-subtle/60">
                                                        <Td>
                                                            <Link to={`/players/${player.id}`} className="flex items-center gap-3">
                                                                <Avatar id={player.id} name={player.name} figure={player.figure} />
                                                                <span className="min-w-0">
                                                                    <span className="block font-medium hover:text-accent">
                                                                        {player.name}
                                                                        <span className="ml-2 text-xs font-normal text-muted">#{player.id}</span>
                                                                    </span>
                                                                    {aboutOf(player, by) && <span className="block max-w-80 truncate text-xs text-muted">{aboutOf(player, by)}</span>}
                                                                </span>
                                                            </Link>
                                                        </Td>
                                                        <Td><Seen player={player} /></Td>
                                                        <Td className="text-xs text-muted"><Ago at={player.joinedUtc} /></Td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )
                    )}
                </Panel>
            </PageBody>
        </>
    );
};
