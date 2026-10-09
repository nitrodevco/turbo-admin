import { Input, Labeled, Panel, Select, Switch } from '#/components/ui';

import type { HotelViewDraft } from './draft';
import { GenericEditor } from './GenericEditor';
import { BOTTOM_SLOT, BOTTOM_SLOT_WIDGETS, isWideSlot, slotKey, WIDGET_TYPES, widgetLabel } from './model';
import { Changed, ScheduleEditor } from './parts';
import { SlotPreview } from './Preview';

const PLACES: Record<number, string> = { 1: 'across the top', 2: 'left column, top', 3: 'right column, top', 4: 'left column, bottom', 5: 'right column, bottom' };

/** One slot: what it holds, and for a container the schedule of promos it shows. */
const SlotEditor = ({ slot, draft, codes, now, onOpenPromo, disabled }: {
    slot: number;
    draft: HotelViewDraft;
    codes: string[];
    now: number;
    onOpenPromo: (code: string) => void;
    disabled?: boolean;
}) => {
    const widgetKey = slotKey(slot, 'widget');
    const type = draft.text(widgetKey);

    return (
        <Panel
            title={<span className="flex items-center gap-2">Slot {slot} <span className="font-normal text-muted">{PLACES[slot]}</span> <Changed on={[ 'widget', 'conf', 'layout', 'separator', 'title', 'ignore' ].some(x => draft.changed(slotKey(slot, x as 'widget')))} /></span>}
            description={type ? widgetLabel(type) : 'Empty'}
        >
            <div className="flex flex-col gap-5 p-4">
                <Labeled label="Holds" hint={type && !WIDGET_TYPES.find(x => x.value === type)?.drawn ? 'Nitro doesn\'t draw this widget yet: players see the slot empty.' : undefined} className="sm:max-w-96">
                    <Select value={type} onChange={event => draft.setText(widgetKey, event.target.value)} disabled={disabled}>
                        <option value="">Nothing</option>
                        {WIDGET_TYPES.map(x => <option key={x.value} value={x.value}>{x.label}{x.drawn ? '' : ' (not drawn yet)'}</option>)}
                        {type && !WIDGET_TYPES.some(x => x.value === type) && <option value={type}>{type}</option>}
                    </Select>
                </Labeled>
                {type === 'widgetcontainer' && (
                    <Labeled label="Promos it shows, by time" hint="From each time on, the promo with that code shows, until the next starts. Promos are made on the Promos tab.">
                        <ScheduleEditor
                            value={draft.text(slotKey(slot, 'conf'))}
                            onChange={value => draft.setText(slotKey(slot, 'conf'), value)}
                            codes={codes}
                            now={now}
                            emptyLabel="the slot is empty"
                            onOpen={onOpenPromo}
                            disabled={disabled}
                        />
                    </Labeled>
                )}
                {type === 'generic' && (
                    <GenericEditor confKey={slotKey(slot, 'conf')} layoutKey={slotKey(slot, 'layout')} draft={draft} wide={isWideSlot(slot)} textPrefix={`landing.view.dynamic.slot.${slot}.`} disabled={disabled} />
                )}
                {(slot === 4 || slot === 5) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Switch label="A heading above it" checked={draft.bool(slotKey(slot, 'separator'))} onChange={checked => draft.setBool(slotKey(slot, 'separator'), checked)} disabled={disabled} />
                        {draft.bool(slotKey(slot, 'separator')) && (
                            <Labeled label="Heading (text key)">
                                <Input value={draft.text(slotKey(slot, 'title'))} onChange={event => draft.setText(slotKey(slot, 'title'), event.target.value)} className="w-full font-mono text-xs" disabled={disabled} />
                            </Labeled>
                        )}
                    </div>
                )}
                {slot === 5 && (
                    <Switch
                        label="Don't line up slots 2 and 3"
                        hint="Normally the top row's two slots are made as tall as each other."
                        checked={draft.bool(slotKey(5, 'ignore'))}
                        onChange={checked => draft.setBool(slotKey(5, 'ignore'), checked)}
                        disabled={disabled}
                    />
                )}
                {type && type !== 'generic' && (
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-muted">Shows at the preview time</span>
                        <div className="max-w-full overflow-auto rounded-lg border border-line bg-[#aae0f0] p-3">
                            <SlotPreview draft={draft} slot={slot} now={now} />
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
};

/** The five widget slots of the reception. */
/**
 * The bottom slot: the default layout's placeholder near the window's foot, beside the avatar. It
 * takes only the layout's fixed widgets - the expiring catalogue page, the community goal and the
 * next limited rare - never a promo or a schedule.
 */
const BottomSlotEditor = ({ draft, now, disabled }: { draft: HotelViewDraft; now: number; disabled?: boolean }) => {
    const key = slotKey(BOTTOM_SLOT, 'widget');
    const type = draft.text(key);

    return (
        <Panel
            title={<span className="flex items-center gap-2">Slot {BOTTOM_SLOT} <span className="font-normal text-muted">at the bottom, beside the avatar</span> <Changed on={draft.changed(key)} /></span>}
            description="Only the layout's fixed widgets go here."
        >
            <div className="flex flex-col gap-4 p-4">
                <Labeled label="Holds" className="sm:max-w-96">
                    <Select value={type} onChange={event => draft.setText(key, event.target.value)} disabled={disabled}>
                        <option value="">Nothing</option>
                        {BOTTOM_SLOT_WIDGETS.map(x => <option key={x} value={x}>{widgetLabel(x)}</option>)}
                        {type && !(BOTTOM_SLOT_WIDGETS as readonly string[]).includes(type) && <option value={type}>{widgetLabel(type)} (not drawn here)</option>}
                    </Select>
                </Labeled>
                {type && (
                    <div className="max-w-full overflow-auto rounded-lg border border-line bg-[#aae0f0] p-3">
                        <SlotPreview draft={draft} slot={BOTTOM_SLOT} now={now} />
                    </div>
                )}
            </div>
        </Panel>
    );
};

export const SlotsTab = ({ draft, codes, now, focus, onOpenPromo, disabled }: {
    draft: HotelViewDraft;
    codes: string[];
    now: number;
    focus: number | null;
    onOpenPromo: (code: string) => void;
    disabled?: boolean;
}) => (
    <div className="flex flex-col gap-4">
        {[ 1, 2, 3, 4, 5 ].filter(slot => focus === null || slot === focus).map(slot => (
            <SlotEditor key={slot} slot={slot} draft={draft} codes={codes} now={now} onOpenPromo={onOpenPromo} disabled={disabled} />
        ))}
        {(focus === null || focus === BOTTOM_SLOT) && <BottomSlotEditor draft={draft} now={now} disabled={disabled} />}
    </div>
);
