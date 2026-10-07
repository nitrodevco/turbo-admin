import { ChevronLeft, ChevronRight, Search, TextSearch, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { type ChatlogCursor, type ChatlogEntry, type ChatlogFilter, type ChatlogResponse, useChatlog, useChatlogContext } from '#/api/chatlog';
import { useMe } from '#/api/queries';
import { ListToolbar } from '#/components/ListToolbar';
import { PhoneLabel, Row, RowList } from '#/components/RowList';
import { Badge, Button, EmptyState, ErrorNotice, IconButton, Input, Loading, PageBody, PageHeader, Panel } from '#/components/ui';
import { cx } from '#/lib/cx';
import { fromNow } from '#/lib/time';
import { formatDateTime } from '#/pages/rooms/labels';

/** A player on a line: a link to their page when you may look at players. */
const PlayerName = ({ id, name, linked }: { id: number; name: string | null; linked: boolean }) => {
    const label = name ?? `player #${id}`;

    return linked
        ? <Link to={`/players/${id}`} className="font-medium hover:text-accent">{label}</Link>
        : <span className={cx('font-medium', !name && 'text-muted')}>{label}</span>;
};

/** The lines of a run, newest first; `highlight` marks the line a context view is around. */
const Lines = ({ data, highlight, onContext }: { data: ChatlogResponse; highlight?: number; onContext?: (entry: ChatlogEntry) => void }) => {
    const me = useMe().data;

    return (
        <RowList
            columns={`max-content minmax(0,9rem) minmax(0,9rem) minmax(0,1fr)${onContext ? ' max-content' : ''}`}
            headers={[ { label: 'When' }, { label: 'Who' }, { label: 'Room' }, { label: 'Said' }, ...(onContext ? [ {} ] : []) ]}
        >
            {data.entries.map(entry => (
                <Row key={entry.id} className={cx(entry.id === highlight && 'bg-accent/10 hover:bg-accent/15')}>
                    <span className="text-xs whitespace-nowrap text-muted sm:text-sm" title={formatDateTime(entry.atUtc)}>
                        {fromNow(entry.atUtc)}
                    </span>
                    <span className="truncate"><PlayerName id={entry.playerId} name={entry.playerName} linked={me?.canViewPlayers ?? false} /></span>
                    <span className="min-w-0 truncate">
                        <PhoneLabel>in </PhoneLabel>
                        {me?.canViewRooms
                            ? <Link to={`/rooms/${entry.roomId}`} className="hover:text-accent">{entry.roomName ?? `room #${entry.roomId}`}</Link>
                            : <span className={cx(!entry.roomName && 'text-muted')}>{entry.roomName ?? `room #${entry.roomId}`}</span>}
                    </span>
                    <span className="basis-full wrap-anywhere sm:basis-auto">
                        {entry.targetPlayerId !== null && (
                            <span className="mr-1.5 inline-flex items-center gap-1 align-middle">
                                <Badge tone="amber">whisper</Badge>
                                <span className="text-xs text-muted">
                                    to <PlayerName id={entry.targetPlayerId} name={entry.targetPlayerName} linked={me?.canViewPlayers ?? false} />
                                </span>
                            </span>
                        )}
                        {entry.message}
                    </span>
                    {onContext && (
                        <IconButton label="Show in context" icon={<TextSearch />} onClick={() => onContext(entry)} className="max-sm:ml-auto" />
                    )}
                </Row>
            ))}
        </RowList>
    );
};

/** One line with what was said around it in its room. */
const Context = ({ id, onBack }: { id: number; onBack: () => void }) => {
    const context = useChatlogContext(id);
    const line = context.data?.entries.find(x => x.id === id);

    return (
        <Panel
            className="overflow-clip"
            title={line ? `In context: ${line.roomName ?? `room #${line.roomId}`}` : 'In context'}
            description="What was said in the room around the line, newest first."
            actions={<Button variant="ghost" icon={<ChevronLeft />} onClick={onBack}>Back to the log</Button>}
        >
            {context.error && <div className="p-4"><ErrorNotice error={context.error} /></div>}
            {context.isPending && <Loading />}
            {context.data && (context.data.entries.length === 0
                ? <EmptyState>There is no such line.</EmptyState>
                : <Lines data={context.data} highlight={id} />)}
        </Panel>
    );
};

const filterOf = (params: URLSearchParams): ChatlogFilter => ({
    player: params.get('player') ?? '',
    room: params.get('room') ?? '',
    text: params.get('text') ?? '',
});

const cursorOf = (params: URLSearchParams): ChatlogCursor => ({
    before: Number(params.get('before')) || undefined,
    after: Number(params.get('after')) || undefined,
});

/**
 * What players said in rooms, newest first, whispers too: narrowed to a player (what they said and
 * what was whispered to them), a room or words, and any line shown in context, with what was said
 * around it in its room. The filter lives in the address, so a player's or room's page can link
 * straight to their chat.
 */
export const ChatlogPage = () => {
    const [ params, setParams ] = useSearchParams();
    const filter = filterOf(params);
    const cursor = cursorOf(params);
    const around = Number(params.get('around')) || null;
    const [ draft, setDraft ] = useState(filter);
    const log = useChatlog(filter, cursor);
    const filtered = Object.values(filter).some(x => x !== '');
    const entries = log.data?.entries ?? [];

    const go = (next: ChatlogFilter, nextCursor: ChatlogCursor = {}, nextAround: number | null = null) => {
        const search = new URLSearchParams();

        for (const [ key, value ] of Object.entries(next))
            if (value)
                search.set(key, value);

        if (nextCursor.before)
            search.set('before', String(nextCursor.before));

        if (nextCursor.after)
            search.set('after', String(nextCursor.after));

        if (nextAround)
            search.set('around', String(nextAround));

        setParams(search);
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        go({ player: draft.player.trim(), room: draft.room.trim(), text: draft.text.trim() });
    };

    const clear = () => {
        setDraft({ player: '', room: '', text: '' });
        setParams(new URLSearchParams());
    };

    const first = entries[0];
    const last = entries[entries.length - 1];

    return (
        <>
            <PageHeader title="Chat log" description="What players said in rooms, whispers included" />
            <PageBody>
                {around
                    ? <Context id={around} onBack={() => go(filter, cursor)} />
                    : (
                            <Panel className="overflow-clip">
                                <ListToolbar watch={[ filter.player, filter.room, filter.text, cursor.before, cursor.after ]}>
                                    <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                        <div className="relative min-w-40 flex-1 sm:max-w-56">
                                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                                            <Input
                                                type="search"
                                                value={draft.player}
                                                onChange={event => setDraft({ ...draft, player: event.target.value })}
                                                placeholder="Player name or id"
                                                aria-label="Player"
                                                className="w-full pl-9"
                                            />
                                        </div>
                                        <Input
                                            type="search"
                                            inputMode="numeric"
                                            value={draft.room}
                                            onChange={event => setDraft({ ...draft, room: event.target.value.replace(/\D/g, '') })}
                                            placeholder="Room id"
                                            aria-label="Room id"
                                            className="w-28 flex-[1_1_6rem] font-mono sm:flex-none"
                                        />
                                        <Input
                                            type="search"
                                            value={draft.text}
                                            onChange={event => setDraft({ ...draft, text: event.target.value })}
                                            placeholder="Words"
                                            aria-label="Words in the line"
                                            className="min-w-32 flex-1 sm:max-w-56"
                                        />
                                        <Button type="submit">Search</Button>
                                        {filtered && <Button type="button" variant="ghost" icon={<X />} onClick={clear}>Clear</Button>}
                                    </form>
                                    <div className="flex items-center gap-1">
                                        <IconButton
                                            label="Newer"
                                            icon={<ChevronLeft />}
                                            disabled={!log.data?.hasNewer || !first}
                                            onClick={() => first && go(filter, { after: first.id })}
                                        />
                                        <IconButton
                                            label="Older"
                                            icon={<ChevronRight />}
                                            disabled={!log.data?.hasOlder || !last}
                                            onClick={() => last && go(filter, { before: last.id })}
                                        />
                                    </div>
                                </ListToolbar>

                                {log.error && <div className="p-4"><ErrorNotice error={log.error} /></div>}
                                {log.isPending && <Loading />}
                                {log.data && (
                                    entries.length === 0
                                        ? <EmptyState>{filtered ? 'No line matches.' : 'Nothing has been said yet.'}</EmptyState>
                                        : (
                                                <div className={cx('transition-opacity', log.isFetching && 'opacity-60')}>
                                                    <Lines data={log.data} onContext={entry => go(filter, cursor, entry.id)} />
                                                </div>
                                            )
                                )}
                            </Panel>
                        )}
            </PageBody>
        </>
    );
};
