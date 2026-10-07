import { Save, Search } from 'lucide-react';
import { useState } from 'react';

import { FURNITURE_KINDS, type FurnitureDefinition, useFurnitureDefinition, useFurnitureSearch, useUpdateDefinition } from '#/api/gamedata';
import { Badge, Button, Checkbox, EmptyState, ErrorNotice, Input, Kv, Labeled, Loading, Panel, SuccessNotice, WarningNotice } from '#/components/ui';
import { cx } from '#/lib/cx';

import { type FieldInfo, FIELDS } from './fields';
import { HabboValuesPanel } from './HabboValuesPanel';
import { showValue } from './labels';

type Item = Record<string, unknown>;

/** A field's value as its input holds it: text for text and numbers, a flag for a flag. */
const toInput = (field: FieldInfo, value: unknown): string | boolean => {
    if (field.kind === 'bool')
        return value === true;

    if (field.kind === 'colors')
        return value && typeof value === 'object' && 'color' in value && Array.isArray(value.color) ? value.color.join(', ') : '';

    return value === null || value === undefined ? '' : String(value);
};

/** The input's value as the server takes it. */
const fromInput = (field: FieldInfo, input: string | boolean): unknown => {
    if (field.kind === 'bool')
        return input === true;

    const text = String(input);

    if (field.kind === 'int' || field.kind === 'number')
        return text.trim() === '' ? 0 : Number(text);

    if (field.kind === 'colors') {
        const colors = text.split(',').map(x => x.trim()).filter(x => x.length > 0);

        return colors.length ? { color: colors } : null;
    }

    return text;
};

interface FileInfo {
    logic?: string | null;
    visualization?: string | null;
    states: number;
    stateAnimations: number[];
    otherAnimations: number[];
    dimensionX?: number | null;
    dimensionY?: number | null;
    dimensionZ?: number | null;
    directions: number[];
    colors: number[];
    layerCount?: number | null;
}

/** What Habbo's asset file of the furniture said, when it was read: why not, when it could not be. */
const HabboFile = ({ definition }: { definition: FurnitureDefinition }) => {
    if (!definition.habboFile)
        return null;

    if (!definition.habboFileRead)
        return <div className="border-b border-line p-4"><WarningNotice>Its file could not be read: {definition.habboFile}</WarningNotice></div>;

    const file = JSON.parse(definition.habboFile) as FileInfo;
    const list = (values: number[]) => (values.length ? values.join(', ') : '-');

    return (
        <dl className="border-b border-line">
            <Kv label="File: logic">{file.logic ?? '-'}</Kv>
            <Kv label="File: visualization">{file.visualization ?? '-'}</Kv>
            <Kv label="File: states">{file.states} (animations {list(file.stateAnimations)}{file.otherAnimations.length ? `; transitions and specials ${list(file.otherAnimations)}` : ''})</Kv>
            <Kv label="File: size">{[ file.dimensionX, file.dimensionY, file.dimensionZ ].map(x => x ?? '-').join(' × ')}</Kv>
            <Kv label="File: directions">{list(file.directions)}</Kv>
            <Kv label="File: colours">{list(file.colors)}</Kv>
            <Kv label="File: layers">{file.layerCount ?? '-'}</Kv>
        </dl>
    );
};

const Editor = ({ definition, canManage }: { definition: FurnitureDefinition; canManage: boolean }) => {
    // The item as the file writes it, and its states, which the file does not carry.
    const item: Item = { ...(JSON.parse(definition.item) as Item), states: definition.states };
    const habbo = definition.habbo ? JSON.parse(definition.habbo) as Item : null;
    const isWall = definition.productType === 1;
    const fields = FIELDS.filter(field => !(isWall && field.floor));
    const original = Object.fromEntries(fields.map(field => [ field.key, toInput(field, item[field.key]) ]));
    const [ draft, setDraft ] = useState<Record<string, string | boolean>>(original);
    const update = useUpdateDefinition(definition.id);
    const changed = fields.filter(field => draft[field.key] !== original[field.key]);

    const set = (key: string, value: string | boolean) => setDraft(current => ({ ...current, [key]: value }));

    return (
        <Panel
            title={definition.className}
            description={`${FURNITURE_KINDS[definition.productType] ?? 'furniture'}, sprite ${String(item.id)}${habbo ? ', from Habbo' : ', the hotel\'s own'}`}
            actions={canManage && (
                <Button
                    icon={<Save />}
                    disabled={update.isPending || changed.length === 0}
                    onClick={() => update.mutate(Object.fromEntries(changed.map(field => [ field.key, fromInput(field, draft[field.key]!) ])))}
                >
                    Save
                </Button>
            )}
        >
            <dl className="border-b border-line">
                <Kv label="Offer (normal catalog)">{showValue(JSON.stringify(item.offerid))}</Kv>
                <Kv label="Offer (Builders Club)">{showValue(JSON.stringify(item.bcofferid))}</Kv>
            </dl>
            <HabboFile definition={definition} />
            <div className="grid gap-3 p-4 sm:grid-cols-2">
                {fields.map((field) => {
                    const fromHabbo = habbo ? toInput(field, habbo[field.key]) : null;
                    const differs = fromHabbo !== null && fromHabbo !== draft[field.key];
                    const shown = field.kind === 'bool' ? (fromHabbo ? 'yes' : 'no') : (fromHabbo === '' ? '-' : String(fromHabbo));

                    return (
                        <div key={field.key} className="flex flex-col gap-1">
                            {field.kind === 'bool'
                                ? (
                                        <Checkbox
                                            label={field.label}
                                            checked={draft[field.key] === true}
                                            onChange={checked => set(field.key, checked)}
                                            disabled={!canManage}
                                        />
                                    )
                                : (
                                        <Labeled label={field.label}>
                                            <Input
                                                value={String(draft[field.key] ?? '')}
                                                onChange={event => set(field.key, event.target.value)}
                                                inputMode={field.kind === 'int' ? 'numeric' : field.kind === 'number' ? 'decimal' : undefined}
                                                disabled={!canManage}
                                                className={cx(differs && 'border-warn')}
                                            />
                                        </Labeled>
                                    )}
                            {differs && (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-warn">Habbo: {shown}</span>
                                    {canManage && (
                                        <button type="button" onClick={() => set(field.key, fromHabbo)} className="font-medium text-accent hover:underline">
                                            Use Habbo's
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {(update.error || update.isSuccess) && (
                <div className="border-t border-line p-4">
                    {update.error && <ErrorNotice error={update.error} />}
                    {update.isSuccess && changed.length === 0 && <SuccessNotice>Saved. Habbo's later updates leave the fields you changed as they are.</SuccessNotice>}
                </div>
            )}
        </Panel>
    );
};

/** Finding a furniture definition by name or id, and its furnidata fields to edit. */
export const FurnitureTab = ({ canManage }: { canManage: boolean }) => {
    const [ text, setText ] = useState('');
    const [ selected, setSelected ] = useState<number | null>(null);
    const { data: results, isFetching } = useFurnitureSearch(text);
    const { data: definition, error } = useFurnitureDefinition(selected);

    return (
        <>
            {canManage && <HabboValuesPanel />}
            <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
                <Panel title="Find furniture">
                    <div className="p-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                            <Input value={text} onChange={event => setText(event.target.value)} placeholder="Classname or id" className="w-full pl-9" aria-label="Find furniture" />
                        </div>
                    </div>
                    {text.trim() && !results && isFetching && <Loading />}
                    {results && results.length === 0 && <EmptyState>No furniture by that name or id.</EmptyState>}
                    {results && results.length > 0 && (
                        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto border-t border-line">
                            {results.map(result => (
                                <li key={result.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelected(result.id)}
                                        className={cx('flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-subtle', selected === result.id && 'bg-subtle')}
                                    >
                                        <span className="truncate">{result.name}</span>
                                        <Badge>{result.type}</Badge>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
                <div>
                    {error && <ErrorNotice error={error} />}
                    {selected === null && <Panel><EmptyState>Find a furniture to see and change what the client's furnidata says of it.</EmptyState></Panel>}
                    {selected !== null && !definition && !error && <Loading />}
                    {definition && <Editor key={`${definition.id}:${definition.item}`} definition={definition} canManage={canManage} />}
                </div>
            </div>
        </>
    );
};
