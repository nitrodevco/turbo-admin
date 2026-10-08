import { FileUp, Lock, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { type GamedataStatus, useDeleteVariable, useSaveVariable, useVariableImport, useVariableImportPreview, useVariableSearch, type VariableEntry } from '#/api/gamedata';
import { ListToolbar } from '#/components/ListToolbar';
import { Button, EmptyState, ErrorNotice, Input, Labeled, Loading, Panel, SuccessNotice, Textarea, WarningNotice } from '#/components/ui';
import { cx } from '#/lib/cx';

import { OpenRow, ReviewItem } from './parts';

/** Why a value isn't JSON, as the server would refuse it; null when it is. */
const jsonProblem = (value: string) => {
    if (value.trim() === '') return 'A value is JSON: "text" in quotes, true, 120 or [1, 2].';

    try {
        JSON.parse(value);

        return null;
    } catch {
        return 'Not JSON: text goes in "quotes"; true, false, numbers and [lists] don\'t.';
    }
};

/** A variable's JSON value, shown on one line. */
const Value = ({ value }: { value: string }) => <span className="truncate font-mono text-xs text-muted">{value}</span>;

/** A variable's value to change, as JSON. */
const VariableEditor = ({ variable, canManage, onDone }: { variable: VariableEntry | null; canManage: boolean; onDone: () => void }) => {
    const [ key, setKey ] = useState(variable?.key ?? '');
    const [ value, setValue ] = useState(variable?.value ?? '');
    const save = useSaveVariable();
    const remove = useDeleteVariable();
    const problem = jsonProblem(value);
    const changed = !variable || value !== variable.value;

    return (
        <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
                event.preventDefault();
                save.mutate({ key: variable?.key ?? key, value }, { onSuccess: onDone });
            }}
        >
            {!variable && (
                <Labeled label="Key">
                    <Input value={key} onChange={event => setKey(event.target.value)} placeholder="socket.url" className="w-full font-mono sm:max-w-96" autoFocus />
                </Labeled>
            )}
            <Labeled label="Value" hint={'JSON: "text" in quotes, true, 120 or [1, 2].'}>
                <Textarea
                    value={value}
                    onChange={event => setValue(event.target.value)}
                    rows={Math.min(12, Math.max(2, value.split('\n').length, Math.ceil(value.length / 100)))}
                    className="font-mono text-xs"
                    disabled={!canManage}
                />
            </Labeled>
            {canManage && changed && problem && value !== '' && <p className="text-xs text-warn">{problem}</p>}
            {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" icon={variable ? <Save /> : <Plus />} disabled={!changed || !!problem || save.isPending || (!variable && key.trim() === '')}>{variable ? 'Save' : 'Add'}</Button>
                    <Button variant="ghost" icon={<X />} onClick={onDone}>Cancel</Button>
                    {variable && (
                        <Button
                            variant="ghost"
                            icon={<Trash2 />}
                            className="ml-auto text-bad hover:text-bad"
                            disabled={remove.isPending}
                            onClick={() => {
                                if (window.confirm(`Remove the variable ${variable.key}? The client falls back to its own default for it.`))
                                    remove.mutate(variable.key, { onSuccess: onDone });
                            }}
                        >
                            Remove
                        </Button>
                    )}
                </div>
            )}
            {(save.error || remove.error) && <ErrorNotice error={save.error ?? remove.error} />}
        </form>
    );
};

/**
 * A client config taken in whole: pasted or read from a file, looked at, then imported. Keys the
 * hotel lacks are added and those that differ changed; the hotel's other variables stay.
 */
const ImportPanel = ({ onDone }: { onDone: () => void }) => {
    const [ json, setJson ] = useState('');
    const preview = useVariableImportPreview();
    const take = useVariableImport();
    const seen = preview.data;

    return (
        <Panel
            title="Import a client config"
            description="Paste a nitro-config.json, or open one. Its keys are added or changed; the hotel's other variables stay."
            actions={<Button variant="ghost" icon={<X />} onClick={onDone}>Close</Button>}
        >
            <div className="flex flex-col gap-3 p-4">
                <Textarea
                    value={json}
                    onChange={(event) => {
                        setJson(event.target.value);
                        preview.reset();
                        take.reset();
                    }}
                    rows={8}
                    placeholder={'{\n    "socket.url": "wss://hotel.example/ws",\n    "catalog.deep.hierarchy": true\n}'}
                    className="font-mono text-xs"
                    aria-label="Client config"
                />
                <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-accent hover:underline [&>svg]:size-4">
                        <FileUp />
                        Open a file
                        <input
                            type="file"
                            accept=".json,application/json"
                            className="sr-only"
                            onChange={(event) => {
                                const file = event.target.files?.[0];

                                event.target.value = '';

                                if (!file) return;

                                void file.text().then((text) => {
                                    setJson(text);
                                    take.reset();
                                    preview.mutate(text);
                                });
                            }}
                        />
                    </label>
                    <Button variant="secondary" icon={<Search />} disabled={json.trim() === '' || preview.isPending} onClick={() => preview.mutate(json)}>Look first</Button>
                    {seen && (
                        <Button
                            icon={<Upload />}
                            disabled={seen.added + seen.updated === 0 || take.isPending}
                            onClick={() => {
                                if (window.confirm(`Import the config? ${seen.added} variables are added and ${seen.updated} changed. It can be rolled back from the history.`))
                                    take.mutate(json);
                            }}
                        >
                            Import
                        </Button>
                    )}
                </div>
                {(preview.error || take.error) && <ErrorNotice error={preview.error ?? take.error} />}
                {take.isSuccess && <SuccessNotice>{take.data.changeSet ? `Imported: ${take.data.changeSet.summary}.` : 'The hotel already had all of it.'}</SuccessNotice>}
                {seen && !take.isSuccess && (
                    <p className="text-sm text-muted">
                        {seen.added} to add, {seen.updated} to change, {seen.unchanged} already the same.
                        {seen.skipped.length > 0 && ` Left out: ${seen.skipped.join(', ')}.`}
                    </p>
                )}
            </div>
            {seen && !take.isSuccess && seen.items.length > 0 && (
                <ul className="divide-y divide-line border-t border-line">
                    {seen.items.map(item => (
                        <ReviewItem key={item.key} action={item.action} name={item.key}>
                            <div className="flex flex-col gap-0.5 font-mono text-xs break-words">
                                {item.current !== null && <span className="text-muted">Hotel: {item.current}</span>}
                                <span>Config: {item.incoming}</span>
                            </div>
                        </ReviewItem>
                    ))}
                    {seen.truncated && <li className="px-4 py-2.5 text-xs text-muted">And more, not listed.</li>}
                </ul>
            )}
        </Panel>
    );
};

/**
 * The client's external variables: its configuration, served from the gamedata host as
 * /gamedata/external_variables/0 (the client's nitro.config.url). The hotel writes its own
 * gamedata addresses into it by hash; staff edit the rest.
 */
export const VariablesTab = ({ status }: { status: GamedataStatus }) => {
    const [ params ] = useSearchParams();
    const [ text, setText ] = useState(() => params.get('q') ?? '');
    const [ page, setPage ] = useState(0);
    const [ open, setOpen ] = useState<string | null>(() => params.get('open'));
    const [ importing, setImporting ] = useState(false);
    const { data: found, isFetching, error } = useVariableSearch(text, page);
    const size = found?.pageSize ?? 1;

    return (
        <>
            {found && found.stamped.length > 0 && (
                <Panel title="Written by the hotel" description="The address of each of the hotel's gamedata files by its current build. They change when a file is built anew, and can't be set here.">
                    <ul className="divide-y divide-line">
                        {found.stamped.map(item => (
                            <li key={item.key} className="grid items-center gap-x-4 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[minmax(12rem,22rem)_1fr_auto]">
                                <span className="truncate font-mono text-[13px]">{item.key}</span>
                                <Value value={item.value} />
                                <Lock className="size-3.5 text-muted max-sm:hidden" aria-label="Written by the hotel" />
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}
            {found && found.stamped.length === 0 && (
                <WarningNotice>
                    The hotel writes no gamedata addresses into the variables: Turbo:Gamedata:PublicUrl isn&apos;t set. Set furnituredata.url, productdata.url, figuredata.url and gamedata.urls.externalTexts here yourself, or set it.
                </WarningNotice>
            )}
            {importing && <ImportPanel onDone={() => setImporting(false)} />}
            <Panel className="overflow-clip">
                <ListToolbar
                    watch={[ text, page ]}
                    page={{ offset: page * size, limit: size, total: found?.total, onChange: offset => setPage(Math.floor(offset / size)) }}
                >
                    <div className="relative min-w-48 flex-1 sm:max-w-96">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                        <Input
                            type="search"
                            value={text}
                            onChange={(event) => {
                                setText(event.target.value);
                                setPage(0);
                            }}
                            placeholder="Key or value"
                            className="w-full pl-9"
                            aria-label="Find variables"
                        />
                    </div>
                    {status.canManage && (
                        <>
                            <Button variant="secondary" icon={<Upload />} onClick={() => setImporting(true)} disabled={importing}>Import</Button>
                            <Button variant="secondary" icon={<Plus />} onClick={() => setOpen('')}>New variable</Button>
                        </>
                    )}
                </ListToolbar>
                {open === '' && (
                    <div className="border-b border-line bg-subtle/40 p-4">
                        <VariableEditor variable={null} canManage={status.canManage} onDone={() => setOpen(null)} />
                    </div>
                )}
                {error && <div className="p-4"><ErrorNotice error={error} /></div>}
                {!found && isFetching && <Loading />}
                {found && found.items.length === 0 && <EmptyState>{text.trim() ? 'No variable has those words.' : 'No variables yet: import the client’s config.'}</EmptyState>}
                {found && found.items.length > 0 && (
                    <ul className={cx('divide-y divide-line transition-opacity', isFetching && 'opacity-60')}>
                        {found.items.map(item => (
                            <OpenRow
                                key={item.key}
                                open={open === item.key}
                                onToggle={() => setOpen(open === item.key ? null : item.key)}
                                summary={(
                                    <div className="grid items-center gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(12rem,22rem)_1fr]">
                                        <span className="truncate font-mono text-[13px]">{item.key}</span>
                                        <Value value={item.value} />
                                    </div>
                                )}
                            >
                                <VariableEditor key={item.value} variable={item} canManage={status.canManage} onDone={() => setOpen(null)} />
                            </OpenRow>
                        ))}
                    </ul>
                )}
            </Panel>
        </>
    );
};
