import { House, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { useRoomSearch } from '#/api/queries';
import type { RoomSearchMode } from '#/api/types';
import { ListToolbar } from '#/components/ListToolbar';
import { Button, EmptyState, ErrorNotice, Input, Loading, PageBody, PageHeader, Panel, Select, Td, Th } from '#/components/ui';
import { cx } from '#/lib/cx';

import { doorModeLabel, formatDateTime } from './labels';

const MODES: { value: RoomSearchMode; label: string; placeholder: string }[] = [
    { value: 'name', label: 'Room name', placeholder: 'Part of the room\'s name' },
    { value: 'owner', label: 'Owner', placeholder: 'The owner\'s name, or how it starts' },
    { value: 'id', label: 'Room id', placeholder: 'e.g. 1234' },
];

const modeOf = (value: string | null): RoomSearchMode =>
    MODES.some(x => x.value === value) ? (value as RoomSearchMode) : 'name';

/**
 * Every room, invisible ones too, by name, owner or id. The search lives in the address, so a
 * search can be shared, and Back from a room returns to it.
 */
export const RoomsPage = () => {
    const [ params, setParams ] = useSearchParams();
    const text = params.get('q') ?? '';
    const by = modeOf(params.get('by'));
    const page = Math.max(1, Number(params.get('page')) || 1);
    const [ draft, setDraft ] = useState(text);
    const [ draftBy, setDraftBy ] = useState(by);
    const search = useRoomSearch(text, by, page);

    const go = (next: { q?: string; by?: RoomSearchMode; page?: number }) =>
        setParams({ q: next.q ?? text, by: next.by ?? by, page: String(next.page ?? page) });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        go({ q: draft.trim(), by: draftBy, page: 1 });
    };

    return (
        <>
            <PageHeader
                title="Rooms"
                icon={<House />}
                description={search.data
                    ? `${search.data.total.toLocaleString()} ${search.data.total === 1 ? 'room' : 'rooms'}${text ? ` matching "${text}"` : ', most recently active first'}`
                    : 'Every room, invisible ones too'}
            />
            <PageBody>
                <Panel className="overflow-clip">
                    <ListToolbar
                        watch={[ text, by, page ]}
                        page={{
                            offset: (page - 1) * (search.data?.pageSize ?? 1),
                            limit: search.data?.pageSize ?? 1,
                            total: search.data?.total,
                            onChange: offset => go({ page: Math.floor(offset / (search.data?.pageSize ?? 1)) + 1 }),
                        }}
                    >
                        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-wrap gap-2">
                            <Select value={draftBy} onChange={event => setDraftBy(modeOf(event.target.value))} aria-label="Search by">
                                {MODES.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                            </Select>
                            <div className="relative min-w-48 flex-1 sm:max-w-80">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                                <Input
                                    type="search"
                                    value={draft}
                                    onChange={event => setDraft(event.target.value)}
                                    placeholder={MODES.find(x => x.value === draftBy)?.placeholder}
                                    aria-label="Search"
                                    inputMode={draftBy === 'id' ? 'numeric' : undefined}
                                    className="w-full pl-9"
                                />
                            </div>
                            <Button type="submit">Search</Button>
                        </form>
                    </ListToolbar>

                    {search.error && <div className="p-4"><ErrorNotice error={search.error} /></div>}
                    {search.isPending && <Loading />}
                    {search.data && (
                        <>
                            {search.data.rooms.length === 0
                                ? <EmptyState>No room matches.</EmptyState>
                                : (
                                        <div className={cx('overflow-x-auto transition-opacity', search.isFetching && 'opacity-60')}>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr>
                                                        <Th>Room</Th>
                                                        <Th>Owner</Th>
                                                        <Th>Access</Th>
                                                        <Th>Players</Th>
                                                        <Th>Last active</Th>
                                                    </tr>
                                                </thead>
                                                <tbody className="[&>tr:last-child>td]:border-b-0">
                                                    {search.data.rooms.map(room => (
                                                        <tr key={room.id} className="hover:bg-subtle/60">
                                                            <Td>
                                                                <Link to={`/rooms/${room.id}`} className="font-medium hover:text-accent">{room.name}</Link>
                                                                <span className="ml-2 text-muted">#{room.id}</span>
                                                                {room.categoryName && <div className="text-xs text-muted">{room.categoryName}</div>}
                                                            </Td>
                                                            <Td className="text-muted">{room.ownerName}</Td>
                                                            <Td>{doorModeLabel(room.doorMode)}</Td>
                                                            <Td className="tabular-nums">
                                                                {room.isLoaded
                                                                    ? <>{room.population}<span className="text-muted"> / {room.playersMax}</span></>
                                                                    : <span className="text-muted">not loaded</span>}
                                                            </Td>
                                                            <Td className="text-muted">{formatDateTime(room.lastActiveUtc)}</Td>
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
