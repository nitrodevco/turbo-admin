import { Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { useCatalogTree } from '#/api/catalog';
import { type CommunityGoal, GOAL_MODES, useCommunityGoals, useDeleteCommunityGoal, useGoalStanding, useHotelViewTexts, useSaveCommunityGoal, useSaveHotelView } from '#/api/hotelView';
import { Badge, Button, EmptyState, ErrorNotice, Input, Labeled, Loading, Panel, Select, SuccessNotice } from '#/components/ui';
import { cx } from '#/lib/cx';

import { inputToIso, isoTime, isoToInput } from './model';

type GoalDraft = Omit<CommunityGoal, 'id'>;

const isVersus = (mode: number) => mode === 1 || mode === 2;

/** A list of numbers as staff type it: `1, 10, 100`. */
const parseNumbers = (text: string) => text.split(/[\s,]+/).filter(Boolean).map(Number).filter(x => Number.isInteger(x));

/** The external texts the goal's widget shows, by what they are; each key ends in the goal's code. */
const goalTexts = (code: string, mode: number) => [
    { key: `landing.view.community.headline.${code}`, label: 'Headline' },
    { key: `landing.view.community.caption.${code}`, label: 'Caption' },
    { key: `landing.view.community.info.${code}`, label: 'Info' },
    { key: `landing.view.community.meter.${code}`, label: 'Meter', hint: '%totalAmount% is the hotel\'s score.' },
    { key: `landing.view.community_catalog_button.text.${code}`, label: 'Catalogue button' },
    ...(mode === 2
        ? [
                { key: `landing.view.vote_one_button.text.${code}`, label: 'Vote for side one' },
                { key: `landing.view.vote_two_button.text.${code}`, label: 'Vote for side two' },
            ]
        : []),
];

/** Where a goal stands in time: running, still to come, or over. */
const phase = (goal: CommunityGoal, now: number) => {
    const starts = isoTime(goal.startsAt) ?? 0;
    const ends = isoTime(goal.endsAt) ?? 0;

    return now < starts ? 'upcoming' : now < ends ? 'running' : 'over';
};

/** A catalog page to pick, by name, from the catalog's tree; typed by id without access to it. */
const PageField = ({ label, hint, value, onChange }: { label: string; hint: string; value: number | null; onChange: (id: number | null) => void }) => {
    const { data: tree } = useCatalogTree();

    if (!tree)
        return (
            <Labeled label={`${label} (page id)`} hint={hint}>
                <Input value={value ?? ''} onChange={event => onChange(event.target.value ? Number(event.target.value) : null)} inputMode="numeric" />
            </Labeled>
        );

    return (
        <Labeled label={label} hint={hint}>
            <Select value={value ?? ''} onChange={event => onChange(event.target.value ? Number(event.target.value) : null)}>
                <option value="">None</option>
                {tree.pages.filter(x => x.id !== tree.rootId).map(page => <option key={page.id} value={page.id}>{page.localization}{page.name ? ` (${page.name})` : ''}</option>)}
            </Select>
        </Labeled>
    );
};

/** The words the goal's widget shows, saved to the external texts. */
const GoalTextsEditor = ({ code, mode, disabled }: { code: string; mode: number; disabled?: boolean }) => {
    const texts = goalTexts(code, mode);
    const { data } = useHotelViewTexts(texts.map(x => x.key));
    const save = useSaveHotelView();
    const [ edits, setEdits ] = useState<Record<string, string>>({});
    const value = (key: string) => edits[key] ?? data?.texts.find(x => x.key === key)?.value ?? '';
    const changed = Object.keys(edits).length > 0;

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">What it says</h3>
            <div className="grid gap-3 sm:grid-cols-2">
                {texts.map(text => (
                    <Labeled key={text.key} label={text.label} hint={text.hint ?? <span className="font-mono">{text.key}</span>}>
                        <Input value={value(text.key)} onChange={event => setEdits(previous => ({ ...previous, [text.key]: event.target.value }))} disabled={disabled} />
                    </Labeled>
                ))}
            </div>
            {!disabled && (
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        icon={<Save />}
                        disabled={!changed || save.isPending}
                        onClick={() => save.mutate(
                            { variables: {}, texts: Object.fromEntries(Object.entries(edits).map(([ key, text ]) => [ key, text === '' ? null : text ])) },
                            { onSuccess: () => setEdits({}) },
                        )}
                    >
                        Save the words
                    </Button>
                    {save.isSuccess && !changed && <span className="text-xs text-muted">Saved: players see them when they next load the client.</span>}
                </div>
            )}
            {save.error && <ErrorNotice error={save.error} />}
        </div>
    );
};

/** How the goal stands: each side's score, who voted, and who gave most. */
const Standing = ({ goal }: { goal: CommunityGoal }) => {
    const { data, error } = useGoalStanding(goal.id);
    const versus = isVersus(goal.mode);

    if (error) return <ErrorNotice error={error} />;
    if (!data) return <Loading />;

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Standing</h3>
            <div className="flex flex-wrap gap-2 text-sm">
                <Badge tone="accent">{versus ? `Side one ${data.sideOne}` : `Score ${data.sideOne}`}</Badge>
                {versus && <Badge tone="accent">Side two {data.sideTwo}</Badge>}
                <Badge>{data.contributors} contributors</Badge>
                {goal.mode === 2 && <Badge>Votes {data.votesOne} to {data.votesTwo}</Badge>}
            </div>
            {data.top.length === 0
                ? <p className="text-sm text-muted">Nobody has given anything yet.</p>
                : (
                        <ol className="divide-y divide-line rounded-lg border border-line text-sm">
                            {data.top.map(x => (
                                <li key={x.playerId} className="flex items-center gap-3 px-3 py-2">
                                    <span className="w-6 text-right font-mono text-xs text-muted">{x.rank}</span>
                                    <Link to={`/players/${x.playerId}`} className="min-w-0 flex-1 truncate text-accent hover:underline">{x.name}</Link>
                                    <span className="font-mono text-xs">{x.score}</span>
                                </li>
                            ))}
                        </ol>
                    )}
        </div>
    );
};

const empty = (now: number): GoalDraft => ({
    code: '',
    mode: 0,
    startsAt: new Date(now).toISOString(),
    endsAt: new Date(now + (7 * 24 * 3600 * 1000)).toISOString(),
    levelScores: [ 100, 500, 1000 ],
    rewardRanks: [ 1, 10, 100 ],
    sideOnePageId: null,
    sideTwoPageId: null,
});

/** One goal: how it is played, when, what counts for it, its words and its standing. */
const GoalEditor = ({ goal, now, onDone, disabled }: { goal: CommunityGoal | null; now: number; onDone: () => void; disabled?: boolean }) => {
    const [ draft, setDraft ] = useState<GoalDraft>(() => (goal ? { ...goal } : empty(now)));
    const [ levels, setLevels ] = useState(() => draft.levelScores.join(', '));
    const [ ranks, setRanks ] = useState(() => draft.rewardRanks.join(', '));
    const save = useSaveCommunityGoal();
    const remove = useDeleteCommunityGoal();
    const set = (change: Partial<GoalDraft>) => setDraft(previous => ({ ...previous, ...change }));
    const versus = isVersus(draft.mode);

    return (
        <div className="flex flex-col gap-5">
            <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    save.mutate({ ...draft, id: goal?.id ?? null, levelScores: parseNumbers(levels), rewardRanks: parseNumbers(ranks), sideTwoPageId: versus ? draft.sideTwoPageId : null }, { onSuccess: () => !goal && onDone() });
                }}
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <Labeled label="Code" hint="Its words are found by it: landing.view.community.headline.<code>.">
                        <Input value={draft.code} onChange={event => set({ code: event.target.value.trim() })} className="font-mono" disabled={disabled} autoFocus={!goal} />
                    </Labeled>
                    <Labeled label="Played as" hint="Show it with the matching widget: Community goal, versus, or versus vote.">
                        <Select value={String(draft.mode)} onChange={event => set({ mode: Number(event.target.value) })} disabled={disabled}>
                            {Object.entries(GOAL_MODES).map(([ value, label ]) => <option key={value} value={value}>{label}</option>)}
                        </Select>
                    </Labeled>
                    <Labeled label="Starts (UTC)" hint="The last goal started is the one players see.">
                        <Input type="datetime-local" value={isoToInput(draft.startsAt)} onChange={event => set({ startsAt: inputToIso(event.target.value) ?? draft.startsAt })} disabled={disabled} />
                    </Labeled>
                    <Labeled label="Ends (UTC)">
                        <Input type="datetime-local" value={isoToInput(draft.endsAt)} onChange={event => set({ endsAt: inputToIso(event.target.value) ?? draft.endsAt })} disabled={disabled} />
                    </Labeled>
                    <Labeled label="Levels" hint={versus ? 'How far a side must be ahead to reach each: one to three, rising.' : 'The scores each level is reached at: one to three, rising.'}>
                        <Input value={levels} onChange={event => setLevels(event.target.value)} placeholder="100, 500, 1000" className="font-mono" disabled={disabled} />
                    </Labeled>
                    <Labeled label="Prize bands" hint="The last rank of each band, rising: 1, 10, 100 is the best, the next nine, the next ninety.">
                        <Input value={ranks} onChange={event => setRanks(event.target.value)} placeholder="1, 10, 100" className="font-mono" disabled={disabled} />
                    </Labeled>
                    <PageField label={versus ? 'Side one\'s catalogue page' : 'Catalogue page'} hint="Each item bought from it is a point." value={draft.sideOnePageId} onChange={id => set({ sideOnePageId: id })} />
                    {versus && <PageField label="Side two's catalogue page" hint="Each item bought from it is a point to side two." value={draft.sideTwoPageId} onChange={id => set({ sideTwoPageId: id })} />}
                </div>
                {draft.mode === 2 && <p className="text-xs text-muted">Every player may also vote once, for a point to the side they choose.</p>}
                {!disabled && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="submit" icon={goal ? <Save /> : <Plus />} disabled={save.isPending || !draft.code}>{goal ? 'Save' : 'Add'}</Button>
                        <Button variant="ghost" icon={<X />} onClick={onDone}>{goal ? 'Close' : 'Cancel'}</Button>
                        {goal && (
                            <Button
                                variant="ghost"
                                icon={<Trash2 />}
                                className="ml-auto text-bad hover:text-bad"
                                disabled={remove.isPending}
                                onClick={() => window.confirm(`Remove the goal ${goal.code}, and everything players gave it?`) && remove.mutate(goal.id, { onSuccess: onDone })}
                            >
                                Remove
                            </Button>
                        )}
                    </div>
                )}
                {save.isSuccess && goal && <SuccessNotice>Saved.</SuccessNotice>}
                {(save.error || remove.error) && <ErrorNotice error={save.error ?? remove.error} />}
            </form>
            {goal && draft.code === goal.code && <GoalTextsEditor code={goal.code} mode={draft.mode} disabled={disabled} />}
            {goal && <Standing goal={goal} />}
        </div>
    );
};

/**
 * The hotel's community goals: one plays at a time (the last started), shown by a slot holding a
 * community goal widget. Players give to it by buying from its catalogue pages, and in a voting
 * goal by voting once. Saved at once.
 */
export const GoalsTab = ({ now, disabled }: { now: number; disabled?: boolean }) => {
    const { data, error } = useCommunityGoals();
    const [ open, setOpen ] = useState<number | 'new' | null>(null);
    const goals = data?.goals ?? [];
    const shown = goals.filter(x => (isoTime(x.startsAt) ?? 0) <= now).sort((a, b) => (isoTime(b.startsAt) ?? 0) - (isoTime(a.startsAt) ?? 0))[0];

    return (
        <Panel
            title="Community goals"
            description="The hotel plays the last one started; put a community goal widget in a slot to show it. Saved at once."
            actions={!disabled && <Button variant="secondary" icon={<Plus />} onClick={() => setOpen('new')} disabled={open === 'new'}>New goal</Button>}
            className="overflow-clip"
        >
            {error && <div className="p-4"><ErrorNotice error={error} /></div>}
            {!data && !error && <Loading />}
            {open === 'new' && <div className="border-b border-line bg-subtle/40 p-4"><GoalEditor goal={null} now={now} onDone={() => setOpen(null)} disabled={disabled} /></div>}
            {data && goals.length === 0 && open !== 'new' && <EmptyState>No goals yet.</EmptyState>}
            <ul className="divide-y divide-line">
                {goals.map(goal => (
                    <li key={goal.id}>
                        <button type="button" onClick={() => setOpen(open === goal.id ? null : goal.id)} className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle', open === goal.id && 'bg-subtle/60')}>
                            <span className="truncate font-mono text-sm">{goal.code}</span>
                            <Badge>{GOAL_MODES[goal.mode] ?? goal.mode}</Badge>
                            {goal.id === shown?.id && <Badge tone="green">Shown</Badge>}
                            <span className="ml-auto text-xs text-muted">{phase(goal, now)}</span>
                        </button>
                        {open === goal.id && <div className="border-t border-line bg-subtle/40 p-4"><GoalEditor key={goal.id} goal={goal} now={now} onDone={() => setOpen(null)} disabled={disabled} /></div>}
                    </li>
                ))}
            </ul>
        </Panel>
    );
};
