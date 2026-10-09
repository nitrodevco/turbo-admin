import { Plus, Trash2 } from 'lucide-react';

import { promoImageUrl, useClientAssets } from '#/api/assets';
import { Button, EmptyState, IconButton, Input, Labeled, Panel, Select } from '#/components/ui';

import type { HotelViewDraft } from './draft';
import { bgObjectKey, formatMovingObject, MAX_MOVING_OBJECTS, MOVING_TYPES, type MovingObject, movingObjectPath, parseMovingObject } from './model';
import { Changed } from './parts';

/** One object: its picture, how it moves, and that movement's numbers. */
const MovingObjectEditor = ({ n, objectKey, draft, disabled }: { n: number; objectKey: string; draft: HotelViewDraft; disabled?: boolean }) => {
    const assets = useClientAssets();
    const object = parseMovingObject(draft.text(objectKey));
    const kind = MOVING_TYPES.find(x => x.value === object.type);
    const set = (change: Partial<MovingObject>) => draft.setText(objectKey, formatMovingObject({ ...object, ...change }));
    const url = object.image ? promoImageUrl(assets, movingObjectPath(object)) : null;

    return (
        <li className="flex flex-col gap-3 p-3">
            <div className="flex flex-wrap items-end gap-3">
                <span className="w-6 pb-2 text-right font-mono text-xs text-muted">{n}</span>
                <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-line bg-[#aae0f0]">
                    {url && <img src={url} alt="" className="max-h-full max-w-full [image-rendering:pixelated]" />}
                </span>
                <Labeled label="Picture" hint={object.type === 'animated' ? 'Frames are <name>1.png, <name>2.png, ... under reception/.' : object.type === 'randomwalk' ? 'Under the image library itself.' : 'Under the image library\'s reception/.'} className="min-w-40 flex-1">
                    <Input value={object.image} onChange={event => set({ image: event.target.value.replace(/[;\s]/g, '') })} className="font-mono text-xs" disabled={disabled} />
                </Labeled>
                <Labeled label="Moves" className="w-40">
                    <Select value={object.type} onChange={event => set({ type: event.target.value, args: [] })} disabled={disabled}>
                        {!kind && <option value={object.type}>{object.type || 'Choose'}</option>}
                        {MOVING_TYPES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                    </Select>
                </Labeled>
                <Changed on={draft.changed(objectKey)} />
                {!disabled && <IconButton label="Remove" icon={<Trash2 />} tone="bad" onClick={() => draft.setJson(objectKey, null)} />}
            </div>
            {kind && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:pl-9">
                    {kind.fields.map((field, i) => (
                        <Labeled key={field} label={field} className={i === 4 && kind.value === 'animated' ? 'col-span-2' : undefined}>
                            <Input
                                value={object.args[i] ?? ''}
                                onChange={(event) => {
                                    const args = [ ...object.args ];

                                    while (args.length <= i) args.push('');

                                    args[i] = event.target.value.replace(/[;\s]/g, '');
                                    set({ args });
                                }}
                                className="font-mono text-xs"
                                disabled={disabled}
                            />
                        </Labeled>
                    ))}
                </div>
            )}
        </li>
    );
};

/**
 * The pictures the reception moves about behind its widgets: up to twenty, each one variable
 * (`landing.view.bgobject.<n>`, or a background set's `landing.view.<code>.bgobject.<n>`), as
 * `<picture>;<type>;<numbers>`. A set shows its own objects, not the default's.
 */
export const MovingObjects = ({ code, draft, disabled }: { code: string; draft: HotelViewDraft; disabled?: boolean }) => {
    const used = Array.from({ length: MAX_MOVING_OBJECTS }, (_, i) => i + 1).filter(n => draft.json(bgObjectKey(code, n)) !== undefined);
    const free = Array.from({ length: MAX_MOVING_OBJECTS }, (_, i) => i + 1).find(n => !used.includes(n));

    return (
        <Panel
            title="Moving objects"
            description={`${code ? `The set ${code}'s` : 'The default set\'s'} pictures moving behind the widgets: along a line, wandering, in a spiral, or an animation. Twenty at most.`}
            actions={!disabled && free !== undefined && (
                <Button variant="secondary" icon={<Plus />} onClick={() => draft.setText(bgObjectKey(code, free), formatMovingObject({ image: '', type: 'line', args: [ '0', '-300', '0.05', '0' ] }))}>
                    Add an object
                </Button>
            )}
            className="overflow-clip"
        >
            {used.length === 0 && <EmptyState>None move here.</EmptyState>}
            <ul className="divide-y divide-line">
                {used.map(n => <MovingObjectEditor key={n} n={n} objectKey={bgObjectKey(code, n)} draft={draft} disabled={disabled} />)}
            </ul>
        </Panel>
    );
};
