import { Save, Search, Undo2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { FILES, FURNITURE_KINDS, type FurnitureDefinition, type GamedataStatus, useFurnitureDefinition, useFurnitureSearch, useImport, useImportPreview, useUpdateDefinition } from '#/api/gamedata';
import { Badge, Button, EmptyState, ErrorNotice, Input, Labeled, Loading, Panel, SuccessNotice, Switch, WarningNotice } from '#/components/ui';
import { cx } from '#/lib/cx';

import { type FieldInfo, FIELDS } from './fields';
import { HabboValuesPanel } from './HabboValuesPanel';
import { showValue } from './labels';
import { FieldChanges, FieldGroup, HabboDiffers, HabboUpdate, ReviewItem } from './parts';

type Item = Record<string, unknown>;

/** The text fields, the numbers and the flags: how the editor groups a definition's fields. */
const TEXT_FIELDS = [ 'name', 'description', 'category', 'furniline', 'environment', 'adurl', 'customparams' ];

/** A field's value as its control holds it: text for text and numbers, a flag for a flag. */
const toInput = (field: FieldInfo, value: unknown): string | boolean => {
    if (field.kind === 'bool')
        return value === true;

    if (field.kind === 'colors')
        return value && typeof value === 'object' && 'color' in value && Array.isArray(value.color) ? value.color.join(', ') : '';

    return value === null || value === undefined ? '' : String(value);
};

/** The control's value as the server takes it. */
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

/** One fact in the editor's summary strip. */
const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="min-w-0">
        <dt className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">{label}</dt>
        <dd className="mt-0.5 truncate font-mono text-[13px]">{children}</dd>
    </div>
);

/** Where the furniture is sold, and what Habbo's asset file said of it. */
const Facts = ({ definition, item }: { definition: FurnitureDefinition; item: Item }) => {
    const list = (values: number[]) => (values.length ? values.join(', ') : '-');
    let file: FileInfo | null = null;

    if (definition.habboFile && definition.habboFileRead)
        file = JSON.parse(definition.habboFile) as FileInfo;

    return (
        <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <Fact label="Offer">{showValue(JSON.stringify(item.offerid))}</Fact>
                <Fact label="Builders Club offer">{showValue(JSON.stringify(item.bcofferid))}</Fact>
                {file && <Fact label="Logic">{file.logic ?? '-'}</Fact>}
                {file && <Fact label="Visualization">{file.visualization ?? '-'}</Fact>}
                {file && <Fact label="States in file">{file.states}{file.otherAnimations.length ? ` (+${file.otherAnimations.length} other)` : ''}</Fact>}
                {file && <Fact label="Size in file">{[ file.dimensionX, file.dimensionY, file.dimensionZ ].map(x => x ?? '-').join(' × ')}</Fact>}
                {file && <Fact label="Directions">{list(file.directions)}</Fact>}
                {file && <Fact label="Layers, colours">{file.layerCount ?? '-'}, {list(file.colors)}</Fact>}
            </dl>
            {definition.habboFile && !definition.habboFileRead && <WarningNotice>Habbo's asset file couldn't be read: {definition.habboFile}</WarningNotice>}
        </div>
    );
};

/** A definition's furnidata fields to change, grouped, with Habbo's beside any the hotel changed. */
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

    const habboOf = (field: FieldInfo) => (habbo ? toInput(field, habbo[field.key]) : null);
    const differs = (field: FieldInfo) => {
        const value = habboOf(field);

        return value !== null && value !== draft[field.key];
    };
    const shown = (field: FieldInfo) => {
        const value = habboOf(field);

        return field.kind === 'bool' ? (value ? 'yes' : 'no') : (value === '' ? '-' : String(value));
    };

    const input = (field: FieldInfo) => (
        <div key={field.key} className="flex flex-col gap-1">
            <Labeled label={field.label}>
                <Input
                    value={String(draft[field.key] ?? '')}
                    onChange={event => set(field.key, event.target.value)}
                    inputMode={field.kind === 'int' ? 'numeric' : field.kind === 'number' ? 'decimal' : undefined}
                    disabled={!canManage}
                    className={cx('w-full', differs(field) && 'border-warn', field.kind !== 'text' && 'font-mono')}
                />
            </Labeled>
            {differs(field) && <HabboDiffers habbo={shown(field)} canManage={canManage} onUse={() => set(field.key, habboOf(field)!)} />}
        </div>
    );

    const texts = fields.filter(field => TEXT_FIELDS.includes(field.key));
    const numbers = fields.filter(field => field.kind !== 'bool' && !TEXT_FIELDS.includes(field.key));
    const flags = fields.filter(field => field.kind === 'bool');
    const habboChanged = fields.filter(differs).length;

    return (
        <Panel
            className="overflow-clip"
            title={<span className="font-mono">{definition.className}</span>}
            description={(
                <span className="flex flex-wrap items-center gap-1.5">
                    <Badge>{FURNITURE_KINDS[definition.productType] ?? 'furniture'}</Badge>
                    <Badge>sprite {String(item.id)}</Badge>
                    {habbo ? <Badge tone="accent">habbo</Badge> : <Badge tone="green">hotel's own</Badge>}
                    {habboChanged > 0 && <Badge tone="amber">{habboChanged} changed from Habbo's</Badge>}
                </span>
            )}
        >
            <div className="flex flex-col gap-6 p-4">
                <Facts definition={definition} item={item} />
                <FieldGroup title="Text">
                    <div className="grid gap-3 sm:grid-cols-2">{texts.map(input)}</div>
                </FieldGroup>
                <FieldGroup title={isWall ? 'Numbers' : 'Size and numbers'}>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">{numbers.map(input)}</div>
                </FieldGroup>
                <FieldGroup title="Behaviour">
                    <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                        {flags.map(field => (
                            <div key={field.key} className="border-b border-line last:border-b-0 sm:border-b-0">
                                <Switch label={field.label} checked={draft[field.key] === true} onChange={checked => set(field.key, checked)} disabled={!canManage} />
                                {differs(field) && <div className="-mt-1 pb-2"><HabboDiffers habbo={shown(field)} canManage={canManage} onUse={() => set(field.key, habboOf(field)!)} /></div>}
                            </div>
                        ))}
                    </div>
                </FieldGroup>
            </div>
            {(update.error || (update.isSuccess && changed.length === 0)) && (
                <div className="px-4 pb-4">
                    {update.error && <ErrorNotice error={update.error} />}
                    {update.isSuccess && changed.length === 0 && <SuccessNotice>Saved. Habbo's later updates leave the fields you changed as they are.</SuccessNotice>}
                </div>
            )}
            {canManage && changed.length > 0 && (
                <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
                    <span className="text-sm text-muted">{changed.length} unsaved {changed.length === 1 ? 'change' : 'changes'}: {changed.map(x => x.label).join(', ')}</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" icon={<Undo2 />} onClick={() => setDraft(original)}>Discard</Button>
                        <Button icon={<Save />} disabled={update.isPending} onClick={() => update.mutate(Object.fromEntries(changed.map(field => [ field.key, fromInput(field, draft[field.key]!) ])))}>
                            Save
                        </Button>
                    </div>
                </div>
            )}
        </Panel>
    );
};

/** Habbo's newest release: what taking its furniture in would change. */
const HabboFurniture = ({ status }: { status: GamedataStatus }) => {
    const release = status.latestRelease;
    const { data: preview, error } = useImportPreview(release !== null);
    const take = useImport();

    return (
        <HabboUpdate
            title="furniture"
            version={release && { name: release.revision.replace(/^PRODUCTION-/, ''), holds: `${release.furnitureCount.toLocaleString()} items`, foundAt: release.foundAt, importedAt: release.importedAt }}
            preview={preview && { ...preview, listed: preview.items.length }}
            error={error}
            extra={preview && preview.filesToRead > 0 && <span>{preview.filesToRead.toLocaleString()} files to read</span>}
            file={FILES.furnitureData}
            canManage={status.canManage}
            canTake={!!preview && (preview.added + preview.updated + preview.kept > 0 || preview.filesToRead > 0)}
            confirm={preview ? `Take in Habbo ${preview.release.revision}? ${preview.filesToRead} furniture files are read first, then ${preview.added} furniture are added and ${preview.updated} updated. It runs in the background and can be rolled back from the history.` : ''}
            onTake={() => preview && take.mutate(preview.release.id)}
            taking={take.isPending}
            takeError={take.error}
        >
            {preview?.items.map(item => (
                <ReviewItem key={`${item.productType}:${item.className}`} action={item.action} name={item.className} kind={FURNITURE_KINDS[item.productType]}>
                    {item.fields.length === 0 ? <span className="text-xs text-muted">new, sprite {item.spriteId}</span> : <FieldChanges fields={item.fields} />}
                </ReviewItem>
            ))}
        </HabboUpdate>
    );
};

/**
 * The hotel's furniture as the client's furnidata has it: Habbo's newest release to review and
 * take in, any definition to find and change, and Habbo's values to put back across them all.
 */
export const FurnitureTab = ({ status }: { status: GamedataStatus }) => {
    const [ text, setText ] = useState('');
    const [ selected, setSelected ] = useState<number | null>(null);
    const [ bulk, setBulk ] = useState(false);
    const { data: results, isFetching } = useFurnitureSearch(text);
    const { data: definition, error } = useFurnitureDefinition(selected);

    return (
        <>
            <HabboFurniture status={status} />
            <div className="grid items-start gap-4 lg:grid-cols-[20rem_1fr]">
                <Panel className="overflow-clip lg:sticky lg:top-16">
                    <div className="border-b border-line p-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                            <Input type="search" value={text} onChange={event => setText(event.target.value)} placeholder="Classname or id" className="w-full pl-9" aria-label="Find furniture" />
                        </div>
                    </div>
                    {!text.trim() && <EmptyState>Type a classname or id.</EmptyState>}
                    {text.trim() && !results && isFetching && <Loading />}
                    {results && results.length === 0 && <EmptyState>No furniture by that name or id.</EmptyState>}
                    {results && results.length > 0 && (
                        <ul className="max-h-[calc(100vh-14rem)] divide-y divide-line overflow-y-auto">
                            {results.map(result => (
                                <li key={result.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelected(result.id)}
                                        className={cx(
                                            'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-subtle/60',
                                            selected === result.id && 'bg-subtle shadow-[inset_2px_0_0_var(--color-accent)]',
                                        )}
                                    >
                                        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{result.name}</span>
                                        <span className="font-mono text-[11px] text-muted tabular-nums">{result.spriteId}</span>
                                        <Badge>{result.type}</Badge>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
                <div className="flex min-w-0 flex-col gap-4">
                    {error && <ErrorNotice error={error} />}
                    {selected === null && (
                        <Panel>
                            <div className="flex flex-col items-start gap-1 px-4 py-10 text-sm">
                                <span className="font-medium">No furniture open</span>
                                <span className="text-muted">Find one on the left to see and change what the client's furnidata says of it.</span>
                            </div>
                        </Panel>
                    )}
                    {selected !== null && !definition && !error && <Panel><Loading /></Panel>}
                    {definition && <Editor key={`${definition.id}:${definition.item}`} definition={definition} canManage={status.canManage} />}
                </div>
            </div>
            {status.canManage && (
                bulk
                    ? <HabboValuesPanel onClose={() => setBulk(false)} />
                    : (
                            <Panel>
                                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <h2 className="text-[13px] font-semibold tracking-wide">Use Habbo's values</h2>
                                        <p className="mt-0.5 text-xs text-muted">Put Habbo's values back in chosen fields, for every furniture Habbo has.</p>
                                    </div>
                                    <Button variant="secondary" onClick={() => setBulk(true)}>Choose fields</Button>
                                </div>
                            </Panel>
                        )
            )}
        </>
    );
};
