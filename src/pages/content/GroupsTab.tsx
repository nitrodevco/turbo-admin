import { Eraser, Plus, Save, Search, Trash2, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { COLOR_SLOTS, GROUP_RANKS, GROUP_TYPES, type GroupBadgePart, type GroupColor, PART_TYPES, useGroup, useGroupAction, useGroupEditor, useGroups, useSaveGroupEditor } from '#/api/content';
import { Pagination } from '#/components/Pagination';
import { Badge, Button, EmptyState, ErrorNotice, IconButton, Input, Labeled, Loading, Panel, Select, SuccessNotice, Textarea } from '#/components/ui';
import { cx } from '#/lib/cx';

/** One group as staff fix it: rename it, put its badge back, take members out, or delete it. */
const GroupDetailPanel = ({ id, canManage, onGone }: { id: number; canManage: boolean; onGone: () => void }) => {
    const { data, error } = useGroup(id);
    const act = useGroupAction();
    const [ name, setName ] = useState<string | null>(null);
    const [ description, setDescription ] = useState<string | null>(null);

    if (error) return <ErrorNotice error={error} />;
    if (!data) return <Loading />;

    const changed = (name !== null && name !== data.name) || (description !== null && description !== data.description);

    return (
        <Panel
            title={data.name}
            description={<>{GROUP_TYPES[data.type] ?? data.type} group of <Link to={`/players/${data.ownerId}`} className="text-accent hover:underline">{data.ownerName}</Link>, home room <Link to={`/rooms/${data.roomId}`} className="text-accent hover:underline">{data.roomName}</Link>. Badge <span className="font-mono">{data.badgeCode}</span>.</>}
            actions={canManage && (
                <>
                    <Button variant="ghost" icon={<Eraser />} disabled={act.isPending} onClick={() => window.confirm(`Put ${data.name}'s badge back to the default one?`) && act.mutate({ id, resetBadge: true })}>Reset badge</Button>
                    <Button
                        variant="ghost"
                        icon={<Trash2 />}
                        className="text-bad hover:text-bad"
                        disabled={act.isPending}
                        onClick={() => window.confirm(`Delete ${data.name}? Its ${data.members.length} members are told, and its home room's group furni goes back to their owners.`) && act.mutate({ id, remove: true }, { onSuccess: onGone })}
                    >
                        Delete
                    </Button>
                </>
            )}
        >
            <div className="flex flex-col gap-4 p-4">
                <form
                    className="flex flex-col gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        act.mutate({ id, rename: { name: name ?? data.name, description: description ?? data.description } }, {
                            onSuccess: () => {
                                setName(null);
                                setDescription(null);
                            },
                        });
                    }}
                >
                    <Labeled label="Name"><Input value={name ?? data.name} onChange={event => setName(event.target.value)} disabled={!canManage} /></Labeled>
                    <Labeled label="Description"><Textarea value={description ?? data.description} onChange={event => setDescription(event.target.value)} rows={2} disabled={!canManage} /></Labeled>
                    {canManage && <div><Button type="submit" icon={<Save />} disabled={!changed || act.isPending}>Save</Button></div>}
                </form>
                {act.isSuccess && <SuccessNotice>Done: the owner's group window and the home room show it now.</SuccessNotice>}
                {act.error && <ErrorNotice error={act.error} />}
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold">Members, requests and blocks{data.members.length >= 500 ? ', the first 500' : ''}</h3>
                    <ul className="divide-y divide-line rounded-lg border border-line">
                        {data.members.map(member => (
                            <li key={member.playerId} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                                <Link to={`/players/${member.playerId}`} className="min-w-0 flex-1 truncate text-accent hover:underline">{member.name}</Link>
                                <Badge tone={member.rank === 0 ? 'accent' : member.rank >= 3 ? 'neutral' : 'green'}>{GROUP_RANKS[member.rank] ?? member.rank}</Badge>
                                {canManage && member.rank !== 0 && (
                                    <IconButton label={`Take ${member.name} out`} icon={<UserMinus />} tone="bad" disabled={act.isPending} onClick={() => window.confirm(`Take ${member.name} out of ${data.name}?`) && act.mutate({ id, removeMember: member.playerId })} />
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Panel>
    );
};

/** A part's files, edited where it is listed. */
const PartRow = ({ part, canManage }: { part: GroupBadgePart; canManage: boolean }) => {
    const [ file, setFile ] = useState(part.fileName);
    const [ mask, setMask ] = useState(part.maskFileName);
    const save = useSaveGroupEditor();
    const changed = file !== part.fileName || mask !== part.maskFileName;

    return (
        <li className="flex flex-wrap items-center gap-2 px-3 py-1.5">
            <span className="w-10 text-right font-mono text-xs text-muted">{part.partId}</span>
            <Input value={file} onChange={event => setFile(event.target.value)} aria-label="File" className="h-8 w-44 font-mono text-xs sm:h-8" disabled={!canManage} />
            <Input value={mask} onChange={event => setMask(event.target.value)} aria-label="Mask" placeholder="no mask" className="h-8 w-44 font-mono text-xs sm:h-8" disabled={!canManage} />
            {canManage && changed && <IconButton label="Save" icon={<Save />} disabled={save.isPending} onClick={() => save.mutate({ kind: 'parts', id: part.id, body: { fileName: file, maskFileName: mask } })} />}
            {save.error && <ErrorNotice error={save.error} />}
        </li>
    );
};

/** A colour's hex, edited where it is listed. */
const ColorRow = ({ color, canManage }: { color: GroupColor; canManage: boolean }) => {
    const [ hex, setHex ] = useState(color.color);
    const save = useSaveGroupEditor();

    return (
        <li className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-8 text-right font-mono text-xs text-muted">{color.colorId}</span>
            <input
                type="color"
                value={`#${/^[0-9a-f]{6}$/i.test(hex) ? hex : '000000'}`}
                onChange={event => setHex(event.target.value.slice(1))}
                disabled={!canManage}
                aria-label={`Colour ${color.colorId}`}
                className="h-8 w-10 cursor-pointer rounded border border-line bg-canvas p-0.5"
            />
            <Input value={hex} onChange={event => setHex(event.target.value.replace('#', ''))} className="h-8 w-24 font-mono text-xs sm:h-8" disabled={!canManage} />
            {canManage && hex !== color.color && <IconButton label="Save" icon={<Save />} disabled={save.isPending} onClick={() => save.mutate({ kind: 'colors', id: color.id, body: { color: hex } })} />}
            {save.error && <ErrorNotice error={save.error} />}
        </li>
    );
};

/**
 * The parts and colours players build group badges from. Their ids are written into every badge
 * code, so they are only added: a file or a colour may change, its id never does.
 */
const BadgeEditor = ({ canManage }: { canManage: boolean }) => {
    const { data, error } = useGroupEditor();
    const save = useSaveGroupEditor();
    const [ partType, setPartType ] = useState('1');
    const [ file, setFile ] = useState('');
    const [ slot, setSlot ] = useState('0');
    const [ hex, setHex ] = useState('');

    if (error) return <ErrorNotice error={error} />;
    if (!data) return <Loading />;

    return (
        <div className="grid items-start gap-4 lg:grid-cols-2">
            <Panel title="Badge parts" description="Bases and symbols; the client loads badgepart_<file>.png. Read again by the hotel as soon as one is saved." className="overflow-clip">
                {[ 0, 1 ].map(type => (
                    <section key={type}>
                        <h3 className="border-b border-line bg-subtle px-3 py-1.5 font-mono text-[11px] tracking-wide text-muted uppercase">{PART_TYPES[type]}s</h3>
                        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                            {data.parts.filter(x => x.partType === type).map(part => <PartRow key={part.id} part={part} canManage={canManage} />)}
                        </ul>
                    </section>
                ))}
                {canManage && (
                    <form
                        className="flex flex-wrap gap-2 border-t border-line p-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            save.mutate({ kind: 'parts', id: null, body: { partType: Number(partType), fileName: file.trim() } }, { onSuccess: () => setFile('') });
                        }}
                    >
                        <Select value={partType} onChange={event => setPartType(event.target.value)} aria-label="Kind" className="w-32">
                            {Object.entries(PART_TYPES).map(([ value, label ]) => <option key={value} value={value}>{label}</option>)}
                        </Select>
                        <Input value={file} onChange={event => setFile(event.target.value)} placeholder="file name" className="min-w-0 flex-1 font-mono text-xs" />
                        <Button type="submit" variant="secondary" icon={<Plus />} disabled={!file.trim() || save.isPending}>Add</Button>
                    </form>
                )}
            </Panel>
            <Panel title="Colours" description="The badge's colours, and the group's two. Changing one repaints every badge that uses it." className="overflow-clip">
                {[ 0, 1, 2 ].map(colorSlot => (
                    <section key={colorSlot}>
                        <h3 className="border-b border-line bg-subtle px-3 py-1.5 font-mono text-[11px] tracking-wide text-muted uppercase">{COLOR_SLOTS[colorSlot]}</h3>
                        <ul className="max-h-60 divide-y divide-line overflow-y-auto">
                            {data.colors.filter(x => x.slot === colorSlot).map(color => <ColorRow key={color.id} color={color} canManage={canManage} />)}
                        </ul>
                    </section>
                ))}
                {canManage && (
                    <form
                        className="flex flex-wrap gap-2 border-t border-line p-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            save.mutate({ kind: 'colors', id: null, body: { slot: Number(slot), color: hex.trim() } }, { onSuccess: () => setHex('') });
                        }}
                    >
                        <Select value={slot} onChange={event => setSlot(event.target.value)} aria-label="Slot" className="w-36">
                            {Object.entries(COLOR_SLOTS).map(([ value, label ]) => <option key={value} value={value}>{label}</option>)}
                        </Select>
                        <Input value={hex} onChange={event => setHex(event.target.value)} placeholder="ff8800" className="w-28 font-mono text-xs" />
                        <Button type="submit" variant="secondary" icon={<Plus />} disabled={!hex.trim() || save.isPending}>Add</Button>
                    </form>
                )}
                {save.error && <div className="p-3"><ErrorNotice error={save.error} /></div>}
            </Panel>
        </div>
    );
};

/**
 * The hotel's groups: found by name, owner or id, and fixed by staff - renamed, the badge put
 * back, members taken out, or deleted - through each group's own grain, as its owner's change
 * would be. Below, the parts and colours group badges are built from.
 */
export const GroupsTab = ({ canManage }: { canManage: boolean }) => {
    const [ text, setText ] = useState('');
    const [ page, setPage ] = useState(0);
    const [ open, setOpen ] = useState<number | null>(null);
    const { data, error, isFetching } = useGroups(text.trim(), page);
    const size = data?.pageSize ?? 25;

    return (
        <div className="flex flex-col gap-4">
            <div className="grid items-start gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
                <Panel className="overflow-clip">
                    <div className="relative border-b border-line p-3">
                        <Search className="pointer-events-none absolute top-1/2 left-6 size-4 -translate-y-1/2 text-muted" />
                        <Input
                            type="search"
                            value={text}
                            onChange={(event) => {
                                setText(event.target.value);
                                setPage(0);
                            }}
                            placeholder="Name, owner, group or room id"
                            className="w-full pl-9"
                            aria-label="Find groups"
                        />
                    </div>
                    {error && <div className="p-4"><ErrorNotice error={error} /></div>}
                    {!data && !error && <Loading />}
                    {data && data.groups.length === 0 && <EmptyState>No group found.</EmptyState>}
                    <ul className={cx('divide-y divide-line transition-opacity', isFetching && 'opacity-60')}>
                        {data?.groups.map(group => (
                            <li key={group.id}>
                                <button type="button" onClick={() => setOpen(group.id)} className={cx('flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-subtle', open === group.id && 'bg-accent-soft/50')}>
                                    <span className="truncate text-sm font-medium">{group.name}</span>
                                    <span className="text-xs text-muted">{group.ownerName} · {group.members} members</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {data && data.total > size && <div className="border-t border-line p-2"><Pagination offset={page * size} limit={size} total={data.total} onChange={offset => setPage(Math.floor(offset / size))} /></div>}
                </Panel>
                {open === null
                    ? <Panel><EmptyState>Choose a group.</EmptyState></Panel>
                    : <GroupDetailPanel key={open} id={open} canManage={canManage} onGone={() => setOpen(null)} />}
            </div>
            <BadgeEditor canManage={canManage} />
        </div>
    );
};
