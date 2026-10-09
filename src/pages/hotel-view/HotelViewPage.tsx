import { useQueryClient } from '@tanstack/react-query';
import { Clock, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { VariableEntry } from '#/api/gamedata';
import { useHotelView, useSaveHotelView } from '#/api/hotelView';
import { Badge, Button, ErrorNotice, Input, Loading, PageBody, PageHeader, Panel, Segmented, SuccessNotice } from '#/components/ui';

import { AllTab } from './AllTab';
import { ArticlesTab } from './ArticlesTab';
import { BackgroundsTab } from './BackgroundsTab';
import { useHotelViewDraft } from './draft';
import { GoalsTab } from './GoalsTab';
import { slotShows } from './hooks';
import { LookTab } from './LookTab';
import { backgroundCodes, BG_TIMING, currentCode, fromLocalInput, nowAt, parseSchedule, parseTime, promoCodes, slotKey, SLOTS, toLocalInput, widgetLabel } from './model';
import { ReceptionPreview } from './Preview';
import { PromosTab } from './PromosTab';
import { SlotsTab } from './SlotsTab';

const TABS = [
    { value: 'preview', label: 'Preview' },
    { value: 'slots', label: 'Slots' },
    { value: 'promos', label: 'Promos' },
    { value: 'articles', label: 'Articles' },
    { value: 'goals', label: 'Community goals' },
    { value: 'backgrounds', label: 'Backgrounds' },
    { value: 'look', label: 'Look' },
    { value: 'all', label: 'All variables' },
];

/** The time the preview and the schedules are shown at: now, following the clock, or one chosen. */
const usePreviewTime = () => {
    const [ chosen, setChosen ] = useState<number | null>(null);
    const [ clock, setClock ] = useState(() => Date.now());

    useEffect(() => {
        if (chosen !== null) return;

        const timer = window.setInterval(() => setClock(Date.now()), 30_000);

        return () => window.clearInterval(timer);
    }, [ chosen ]);

    return { now: chosen ?? clock, chosen, setChosen };
};

/** What the reception shows at the time: the backgrounds set, and each slot's widget or promo. */
const ShowingNow = ({ draft, now, onSlot }: { draft: ReturnType<typeof useHotelViewDraft>; now: number; onSlot: (slot: number) => void }) => {
    const background = currentCode(parseSchedule(draft.text(BG_TIMING)), now).code;

    return (
        <ul className="divide-y divide-line text-sm">
            <li className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="text-muted">Backgrounds</span>
                <span className="font-mono text-xs">{background || 'default'}</span>
            </li>
            {SLOTS.map((slot) => {
                const shows = slotShows(draft, slot, now);
                const container = draft.text(slotKey(slot, 'widget')) === 'widgetcontainer';

                return (
                    <li key={slot}>
                        <button type="button" onClick={() => onSlot(slot)} className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-subtle">
                            <span className="text-muted">Slot {slot}</span>
                            <span className="flex min-w-0 items-center gap-2">
                                {container && shows.code && <span className="truncate font-mono text-xs">{shows.code}</span>}
                                {shows.type ? <Badge>{widgetLabel(shows.type)}</Badge> : <span className="text-xs text-muted">{container ? 'nothing scheduled' : 'empty'}</span>}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

/** The editor, once the variables are in. */
const HotelViewEditor = ({ variables, canManage }: { variables: VariableEntry[]; canManage: boolean }) => {
    const [ params, setParams ] = useSearchParams();
    const tab = TABS.some(x => x.value === params.get('tab')) ? params.get('tab')! : 'preview';
    const slotParam = Number(params.get('slot'));
    const focus = SLOTS.includes(slotParam as 1) ? slotParam : null;
    const promo = params.get('promo');
    const draft = useHotelViewDraft(variables);
    const save = useSaveHotelView();
    const queryClient = useQueryClient();
    const { now, chosen, setChosen } = usePreviewTime();
    const disabled = !canManage;

    const scheduledPromos = SLOTS.flatMap(slot => parseSchedule(draft.text(slotKey(slot, 'conf'))).map(x => x.code));
    const promos = promoCodes(draft.keys, scheduledPromos);
    const backgrounds = backgroundCodes(draft.keys, parseSchedule(draft.text(BG_TIMING)).map(x => x.code));

    const go = (next: Record<string, string>) => setParams(next, { replace: true });

    // Unsaved changes are lost with the page: say so before it closes.
    useEffect(() => {
        if (draft.count === 0) return;

        const warn = (event: BeforeUnloadEvent) => event.preventDefault();

        window.addEventListener('beforeunload', warn);

        return () => window.removeEventListener('beforeunload', warn);
    }, [ draft.count ]);

    return (
        <>
            <PageHeader
                title="Hotel view"
                description="The reception players land in: its backgrounds, widget slots and promos, written to the client's external variables"
                tabs={{ items: TABS, value: tab, onChange: value => go({ tab: value }) }}
            >
                <Badge tone={canManage ? 'accent' : 'neutral'}>{canManage ? 'Can edit' : 'Read only'}</Badge>
            </PageHeader>
            <PageBody className="flex flex-col gap-4 lg:gap-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Clock className="size-4 text-muted" />
                    <span className="text-muted">Showing the reception at</span>
                    <Input
                        type="datetime-local"
                        value={toLocalInput(nowAt(now))}
                        onChange={event => setChosen(parseTime(fromLocalInput(event.target.value)))}
                        className="w-56"
                        aria-label="Preview time (UTC)"
                    />
                    <span className="text-muted">UTC</span>
                    {chosen !== null && <Button variant="ghost" onClick={() => setChosen(null)}>Now</Button>}
                </div>
                {save.isSuccess && draft.count === 0 && (
                    <SuccessNotice>
                        {save.data.changeSet ? <>Saved: {save.data.changeSet.summary}. Players see it when they next load the client. It can be rolled back from <Link to="/gamedata?tab=history" className="underline">the gamedata history</Link>.</> : 'Nothing had changed.'}
                    </SuccessNotice>
                )}
                {tab === 'preview' && (
                    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                        <Panel title="As a player sees it" description="On a 1600 by 900 window. Click a slot to edit it. The avatar and the toolbar are left out.">
                            <div className="p-3">
                                <ReceptionPreview draft={draft} now={now} onSlot={slot => go({ tab: 'slots', slot: String(slot) })} />
                            </div>
                        </Panel>
                        <Panel title="Showing">
                            <ShowingNow draft={draft} now={now} onSlot={slot => go({ tab: 'slots', slot: String(slot) })} />
                        </Panel>
                    </div>
                )}
                {tab === 'slots' && (
                    <>
                        <div className="sm:max-w-md">
                            <Segmented
                                label="Slot"
                                value={focus === null ? 'all' : String(focus)}
                                onChange={value => go(value === 'all' ? { tab: 'slots' } : { tab: 'slots', slot: value })}
                                options={[ { value: 'all', label: 'All' }, ...SLOTS.map(x => ({ value: String(x), label: String(x) })) ]}
                            />
                        </div>
                        <SlotsTab draft={draft} codes={promos} now={now} focus={focus} onOpenPromo={code => go({ tab: 'promos', promo: code })} disabled={disabled} />
                    </>
                )}
                {tab === 'promos' && (
                    <PromosTab
                        draft={draft}
                        codes={promos}
                        now={now}
                        open={promo}
                        onOpen={code => go(code ? { tab: 'promos', promo: code } : { tab: 'promos' })}
                        onOpenSlot={slot => go({ tab: 'slots', slot: String(slot) })}
                        disabled={disabled}
                    />
                )}
                {tab === 'articles' && <ArticlesTab now={now} disabled={disabled} />}
                {tab === 'goals' && <GoalsTab now={now} disabled={disabled} />}
                {tab === 'backgrounds' && <BackgroundsTab draft={draft} codes={backgrounds} now={now} disabled={disabled} />}
                {tab === 'look' && <LookTab draft={draft} disabled={disabled} />}
                {tab === 'all' && <AllTab draft={draft} disabled={disabled} />}
                {canManage && (draft.count > 0 || save.isError) && (
                    <div className="sticky bottom-3 z-20 rounded-xl border border-accent/40 bg-surface/95 shadow-lg backdrop-blur">
                        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <span className="text-sm">
                                <span className="font-semibold">{draft.count}</span> {draft.count === 1 ? 'change' : 'changes'} not saved
                                <span className="text-muted max-sm:hidden"> · saved together, rolled back together</span>
                            </span>
                            {save.error && <div className="w-full sm:order-last"><ErrorNotice error={save.error} /></div>}
                            <span className="ml-auto flex gap-2">
                                <Button variant="ghost" icon={<RotateCcw />} disabled={save.isPending || draft.count === 0} onClick={() => window.confirm('Throw away every change not saved?') && draft.discard()}>Discard</Button>
                                <Button
                                    icon={<Save />}
                                    disabled={save.isPending || draft.count === 0}
                                    onClick={() => save.mutate({ variables: draft.variables, texts: draft.texts }, {
                                        onSuccess: async () => {
                                            // What was saved is the server's now: read it, then let go of the changes.
                                            await queryClient.refetchQueries({ queryKey: [ 'gamedata', 'hotel-view' ] });
                                            draft.discard();
                                        },
                                    })}
                                >
                                    {save.isPending ? 'Saving' : 'Save'}
                                </Button>
                            </span>
                        </div>
                    </div>
                )}
            </PageBody>
        </>
    );
};

/**
 * The hotel view: the reception the client shows outside rooms. Everything on it is the client's
 * `landing.view.*` external variables - the background layers and their timed sets, the five widget
 * slots, the promos container slots schedule - and the external texts its promos say. Edits are
 * kept here until saved, then saved as one change set.
 */
export const HotelViewPage = () => {
    const { data, error } = useHotelView();

    if (!data)
        return (
            <>
                <PageHeader title="Hotel view" description="The reception players land in" />
                <PageBody>{error ? <ErrorNotice error={error} /> : <Loading />}</PageBody>
            </>
        );

    return <HotelViewEditor variables={data.variables} canManage={data.canManage} />;
};
