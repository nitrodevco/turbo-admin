import { useQueries } from '@tanstack/react-query';
import { Braces, ChevronRight, Package, Plus, Power, PowerOff, Save, Trash2, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { pluginTemplatePatchesQuery, usePluginTemplatePatches } from '#/api/appearance';
import { type HotelPatch, usePatches, useRemovePatch, useSavePatch } from '#/api/noCode';
import { type Plugin, type PluginActionResponse, type PluginClientIssue, usePluginContributions, usePlugins, useSetPluginEnabled } from '#/api/plugins';
import { type TemplateIndex, useTemplateIndex } from '#/api/windows';
import { folderOf, useWorkingOn } from '#/appearance/workingOn';
import { WorkingOnPicker } from '#/appearance/WorkingOnPicker';
import { ask } from '#/components/confirm';
import { useSaved } from '#/components/SaveFeedback';
import { toast, toastError } from '#/components/toast';
import { Badge, Button, EmptyState, ErrorNotice, FieldLabel, IconButton, Input, Labeled, Loading, PageBody, PageHeader, Panel, Textarea, TextButton, TextLink, WarningNotice } from '#/components/ui';
import { useHubTabs } from '#/layout/nav';
import { cx } from '#/lib/cx';
import { plural } from '#/lib/plural';
import { outdatedReasons } from '#/pages/appearance/outdated';
import { DesignPreview } from '#/preview/DesignPreview';
import { useOpsHistory } from '#/preview/opsHistory';
import { VisualEditor } from '#/preview/VisualEditor';

import { PackageDialog } from './PackageDialog';
import { ReportCounts, ReportWords } from './PatchReports';
import { PatchTest } from './PatchTest';
import { PLUGIN_STATES } from './pluginStates';
import { issuesOf, patchIssues } from './reportKinds';

/** What of a patch is gone from the client the hotel runs, said in place (Outdated patches lists them all). */
const Outdated = ({ template, ops }: { template: string; ops: unknown }) => {
    const { data: index } = useTemplateIndex();
    const reasons = index ? outdatedReasons(index, template, ops) : [];

    return reasons.map(reason => (
        <p key={reason.element ?? ''} className="flex flex-wrap items-center gap-1.5 text-xs text-bad">
            <Badge tone="red">outdated</Badge>
            {reason.text}
        </p>
    ));
};

/** A plugin action's answer as a toast: what it did, or why not. */
const said = { onSuccess: (answer: PluginActionResponse) => (answer.ok ? toast(answer.message) : toastError(new Error(answer.message))), onError: toastError };

/**
 * What a pasted text is as a patch: the inspector's "copy patch" (`api.templates.patch('<id>', [ ...ops ])`
 * or a file entry `{ "template", "ops" }`) or the ops alone. Null when it is no JSON at all.
 */
const readPasted = (text: string): { template?: string; ops: unknown } | null => {
    const call = /templates\.patch\(\s*['"]([^'"]+)['"]\s*,\s*([\s\S]*)\)\s*;?\s*$/.exec(text.trim());

    try {
        if (call) return { template: call[1], ops: JSON.parse(call[2]!.replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/'/g, '"')) as unknown };

        const parsed = JSON.parse(text) as unknown;

        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'ops' in parsed)
            return parsed as { template?: string; ops: unknown };

        return { ops: Array.isArray(parsed) ? parsed : [ parsed ] };
    } catch {
        return null;
    }
};

/** A patch's form; a `patch` with no id (a draft from the windows browser) is saved as a new one. */
export const PatchEditor = ({ patch, onDone }: { patch: HotelPatch | null; onDone: () => void }) => {
    const [ name, setName ] = useState(patch?.name ?? '');
    const [ template, setTemplate ] = useState(patch?.template ?? '');
    const [ order, setOrder ] = useState(patch?.order === null || patch?.order === undefined ? '' : String(patch.order));
    const [ ops, setOps ] = useState(patch ? JSON.stringify(patch.ops, null, 2) : '[\n  { "element": "help_button", "set": { "color": 4281244476 } }\n]');
    const { key: target } = useWorkingOn();
    const save = useSavePatch(target);
    const saved = useSaved();
    const hotel = usePatches(target).data;
    const [ showJson, setShowJson ] = useState(false);
    const pasted = readPasted(ops);
    const problem = pasted === null ? 'The ops are not JSON yet.' : !Array.isArray(pasted.ops) ? 'The ops are a list: [ { "element": ..., "set": { ... } } ].' : null;
    const patched = pasted?.template ?? template;
    // The working-on theme's patch file as players would get it with this draft saved: its other patches that are on, and this one.
    const others = hotel?.patches.filter(other => !other.disabled && other.id !== patch?.id).map(other => ({ template: other.template, ops: other.ops, order: other.order })) ?? [];
    const draft = (!problem && pasted && hotel)
        ? { patches: { [hotel.key]: { patches: [ ...others, { template: patched, ops: pasted.ops, order: order === '' ? null : Number(order) } ] } } }
        : undefined;
    const list = (!problem && pasted) ? (pasted.ops as unknown[]) : null;
    const history = useOpsHistory(list ?? [], useCallback((next: unknown[]) => setOps(JSON.stringify(next, null, 2)), []));

    return (
        <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
                event.preventDefault();

                if (!pasted || problem) return;

                save.mutate(
                    { id: patch?.id ?? '', name, template: pasted.template ?? template, order: order === '' ? null : Number(order), ops: pasted.ops, disabled: patch?.disabled ?? false },
                    { onSuccess: () => {
                        saved(name);
                        onDone();
                    } },
                );
            }}
        >
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem]">
                <Labeled label="Name"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Green help button" className="w-full" /></Labeled>
                <Labeled label="Template" hint={<>{'<library>/<asset>, as '}<TextLink inline to="/appearance/windows">Windows &amp; skins</TextLink>{' lists it.'}</>}><Input value={pasted?.template ?? template} onChange={event => setTemplate(event.target.value)} placeholder="habbo-toolbar-com/purse_xml" className="w-full font-mono" /></Labeled>
                <Labeled label="Order" hint="Lower first; a theme takes a negative one."><Input type="number" value={order} onChange={event => setOrder(event.target.value)} className="w-full" /></Labeled>
            </div>
            {patched && list && (
                <div className="flex flex-col gap-1.5">
                    <FieldLabel>The window as players will see it once saved, drawn by the client as you change it: click an element, drag it or its handles, or change it on the right</FieldLabel>
                    <VisualEditor
                        template={patched}
                        ops={list}
                        history={history}
                        draft={draft}
                        owner={hotel?.key}
                        footer={picked => showJson && picked?.key !== null && picked !== null && (
                            <Button variant="secondary" icon={<Plus />} onClick={() => history.change([ ...list, { element: picked.key, set: {} } ])}>
                                {`Add an op on '${picked.key}'`}
                            </Button>
                        )}
                    />
                </div>
            )}
            {patched && !list && <DesignPreview template={patched} />}
            <div>
                <Button variant="ghost" icon={<Braces />} aria-expanded={showJson || !!problem} onClick={() => setShowJson(!showJson)}>{showJson || problem ? 'Hide JSON' : 'Show JSON'}</Button>
            </div>
            {(showJson || problem) && (
                <Labeled label="Ops" hint="JSON: each names its element and does one of set, remove, insert, move, wrap, bind (a value per window or per list row, from placeholders such as ctx.key and item.key) or arrange (x, y, width, height once the window is laid out, as numbers or formulas over element measures and ctx keys). Paste the client's alt-click &quot;copy patch&quot; straight in.">
                    <Textarea value={ops} onChange={event => setOps(event.target.value)} rows={10} className="font-mono" spellCheck={false} />
                </Labeled>
            )}
            {problem && <p className="text-xs text-warn">{problem}</p>}
            {!problem && pasted && <PatchTest template={pasted.template ?? template} ops={pasted.ops as unknown[]} />}
            {save.error && <ErrorNotice error={save.error} />}
            <div className="flex gap-2">
                <Button type="submit" icon={<Save />} disabled={save.isPending || !!problem || !name.trim()}>{save.isPending ? 'Saving…' : 'Save'}</Button>
                <Button variant="ghost" icon={<X />} onClick={onDone}>Cancel</Button>
                {/* The hotel's plugin is loaded again to serve the new file, which takes a few seconds: said, so a click is not taken for nothing. */}
                {save.isPending && <span className="self-center text-xs text-muted">{`Writing it into ${folderOf(target)} and loading that plugin again; this takes a few seconds.`}</span>}
            </div>
        </form>
    );
};

/**
 * One of the working-on theme's patches: its name, which opens its editor under it; its window and
 * ops; what clients report of it; and what of it a client update took away. Turned off or on, and
 * removed, from its row. Template patches lists them all; Windows & skins those on one window.
 */
export const PatchRow = ({ patch, issues, canManage, open, onToggle, onWindow = true, className }: {
    patch: HotelPatch;
    issues: readonly PluginClientIssue[];
    canManage: boolean;
    open: boolean;
    onToggle: () => void;
    /** Whether the row names its window: not where the page is about one window already. */
    onWindow?: boolean;
    className?: string;
}) => {
    const { key: target } = useWorkingOn();
    const save = useSavePatch(target);
    const remove = useRemovePatch(target);
    const mine = issuesOf(issues, patch.template, patch.ops);

    return (
        <li className={cx('flex flex-col gap-2 px-4 py-3', className)} data-patch={patch.id}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={onToggle}
                    className="-ml-1 flex min-w-0 items-center gap-1.5 rounded-md px-1 text-left hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                >
                    <ChevronRight aria-hidden className={cx('size-4 shrink-0 text-muted transition-transform', open && 'rotate-90')} />
                    <span className={cx('truncate font-medium', patch.disabled && 'text-muted')}>{patch.name || 'Unnamed patch'}</span>
                </button>
                {patch.disabled && <Badge>off</Badge>}
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                    {onWindow && <Link to={`/appearance/studio?${new URLSearchParams({ window: patch.template })}`} className="truncate font-mono hover:text-accent">{patch.template}</Link>}
                    {onWindow && <span aria-hidden>·</span>}
                    <span className="shrink-0">{plural(Array.isArray(patch.ops) ? patch.ops.length : 0, 'op')}</span>
                </span>
                <span className="ml-auto flex items-center gap-2">
                    {!patch.disabled && <ReportCounts issues={mine} />}
                    {canManage && (
                        <>
                            <Button small variant="ghost" icon={patch.disabled ? <Power /> : <PowerOff />} disabled={save.isPending} onClick={() => save.mutate({ ...patch, disabled: !patch.disabled }, { onError: toastError })}>
                                {patch.disabled ? 'Turn on' : 'Turn off'}
                            </Button>
                            <IconButton
                                small
                                tone="bad"
                                label={`Remove ${patch.name}`}
                                icon={<Trash2 />}
                                disabled={remove.isPending}
                                onClick={() => ask({ title: `Remove the patch ${patch.name}?`, confirm: 'Remove', danger: true }, () => remove.mutate(patch.id, { onError: toastError }))}
                            />
                        </>
                    )}
                </span>
            </div>
            <div className="flex flex-col gap-1 pl-6 empty:hidden">
                <Outdated template={patch.template} ops={patch.ops} />
                {!patch.disabled && <ReportWords issues={mine} />}
            </div>
            {open && <div className="rounded-lg border border-line bg-canvas/50 p-3 sm:p-4"><PatchEditor patch={patch} onDone={onToggle} /></div>}
        </li>
    );
};

/** Whether a patch names a window or an element the client the hotel runs no longer has: a client update renamed or took it out. */
const isOutdated = (index: TemplateIndex | undefined, patch: { template: string; ops: unknown }) => !!index && outdatedReasons(index, patch.template, patch.ops).length > 0;

/**
 * The patches of the theme staff work on (the hotel's own by default): made, edited, turned off and
 * removed here; held in its data plugin's files. With `onlyOutdated`, those that are on and outdated.
 */
const HotelPatches = ({ onlyOutdated }: { onlyOutdated: boolean }) => {
    const { key: target, name: targetName } = useWorkingOn();
    const { data, error } = usePatches(target);
    const index = useTemplateIndex().data;
    const issues = patchIssues(usePluginContributions(data?.key ?? target).data?.clientIssues);
    const [ open, setOpen ] = useState<string | null>(null);
    const [ packaging, setPackaging ] = useState(false);
    const shown = data?.patches.filter(patch => !onlyOutdated || (!patch.disabled && isOutdated(index, patch))) ?? [];

    return (
        <Panel
            title={`${targetName}'s patches`}
            description={`Saved in ${folderOf(target)}: turning that plugin off takes them all away at once.`}
            actions={data?.canManage && (
                <>
                    <Button variant="secondary" icon={<Package />} disabled={!data.patches.length} onClick={() => setPackaging(true)}>Make a plugin</Button>
                    <Button icon={<Plus />} disabled={open === 'new'} onClick={() => setOpen('new')}>New patch</Button>
                </>
            )}
        >
            {error && <div className="p-4"><ErrorNotice error={error} /></div>}
            {!data && !error && <Loading />}
            {open === 'new' && <div className="border-b border-line bg-canvas/50 p-4"><PatchEditor patch={null} onDone={() => setOpen(null)} /></div>}
            {data && data.patches.length === 0 && open !== 'new' && <EmptyState>{`No patches in ${targetName} yet: New patch makes one, or pick an element in the Theme studio.`}</EmptyState>}
            {data && data.patches.length > 0 && shown.length === 0 && <EmptyState>{`None of ${targetName}'s patches that are on is outdated.`}</EmptyState>}
            <ul className="divide-y divide-line">
                {shown.map(patch => (
                    <PatchRow key={patch.id} patch={patch} issues={issues} canManage={data!.canManage} open={open === patch.id} onToggle={() => setOpen(open === patch.id ? null : patch.id)} />
                ))}
            </ul>
            <PackageDialog pluginKey={data?.key ?? target} open={packaging} onClose={() => setPackaging(false)} />
        </Panel>
    );
};

/**
 * One plugin's patches, as its wwwroot/template-patches.json gives them: each window with its ops,
 * what players' clients report of it and what is gone from the current client; the plugin turned
 * off or on here takes them all away or back. With `onlyOutdated`, a plugin that is on, and only its
 * outdated patches; none, and it is left out.
 */
const PluginPatches = ({ plugin, canManage, onlyOutdated }: { plugin: Plugin; canManage: boolean; onlyOutdated: boolean }) => {
    const { data } = usePluginTemplatePatches(plugin.key);
    const index = useTemplateIndex().data;
    const contributions = usePluginContributions(plugin.key).data;
    const setEnabled = useSetPluginEnabled();
    const patches = data?.patches ?? [];
    const issues = patchIssues(contributions?.clientIssues);
    const state = PLUGIN_STATES[plugin.state];
    const shown = !onlyOutdated ? patches : plugin.state === 'loaded' ? patches.filter(patch => isOutdated(index, patch)) : [];

    if (onlyOutdated ? shown.length === 0 : patches.length === 0 && issues.length === 0) return null;

    return (
        <li id={plugin.key} className="flex scroll-mt-20 flex-col gap-2.5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="font-medium">{plugin.name ?? plugin.key}</span>
                <span className="font-mono text-xs text-muted">{plugin.key}</span>
                {plugin.state !== 'loaded' && <Badge tone={state.tone}>{`plugin ${state.label}`}</Badge>}
                <span className="text-xs text-muted">{onlyOutdated ? `${shown.length} of ${plural(patches.length, 'patch', 'patches')} outdated` : plural(patches.length, 'patch', 'patches')}</span>
                <span className="ml-auto flex items-center gap-2">
                    <TextLink to={`/appearance/studio?${new URLSearchParams({ tab: 'settings', theme: plugin.key })}`}>Theme settings</TextLink>
                    {canManage && (plugin.state === 'loaded'
                        ? <Button small variant="ghost" icon={<PowerOff />} disabled={setEnabled.isPending} onClick={() => ask({ title: `Turn ${plugin.name ?? plugin.key} off?`, body: 'Its patches, styles and everything else it adds are taken away; players lose them at their next load.', confirm: 'Turn off' }, () => setEnabled.mutate({ key: plugin.key, enabled: false }, said))}>Turn off</Button>
                        : <Button small variant="ghost" icon={<Power />} disabled={setEnabled.isPending} onClick={() => setEnabled.mutate({ key: plugin.key, enabled: true }, said)}>Turn on</Button>)}
                </span>
            </div>
            {shown.length > 0 && (
                <ul className="divide-y divide-line rounded-lg border border-line">
                    {shown.map((patch, at) => {
                        const mine = issuesOf(issues, patch.template, patch.ops);

                        return (
                            <li key={`${patch.template}-${at}`} className="flex flex-col gap-1 px-3 py-2">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <Link to={`/appearance/studio?${new URLSearchParams({ window: patch.template })}`} className="min-w-0 truncate font-mono text-ui hover:text-accent">{patch.template}</Link>
                                    <span className="text-xs text-muted">{`${plural(Array.isArray(patch.ops) ? patch.ops.length : 0, 'op')}${patch.order === null ? '' : ` · order ${patch.order}`}`}</span>
                                    <span className="ml-auto"><ReportCounts issues={mine} /></span>
                                </div>
                                <Outdated template={patch.template} ops={patch.ops} />
                                <ReportWords issues={mine} />
                            </li>
                        );
                    })}
                </ul>
            )}
            {/* Reports with no patch left to put them beside (its file emptied since): said under the plugin. */}
            {patches.length === 0 && <ReportWords issues={issues} />}
        </li>
    );
};

/**
 * Every window patch the hotel's clients are given: the working-on theme's own, which staff make
 * here, then each plugin's, with what clients report of them (applied, unmatched by a new client
 * release, conflicting with another owner's) and what a client update took away. When a client
 * update left patches naming a window or element it no longer has (XenForo's Outdated templates),
 * it says how many, before any player's client reports them, and `?show=outdated` lists only those:
 * the working-on theme's that are on, and those of plugins that are on.
 */
export const PatchesPage = () => {
    const tabs = useHubTabs('themes');
    const { data, error } = usePlugins();
    const { key: target } = useWorkingOn();
    const index = useTemplateIndex().data;
    const hotel = usePatches(target).data;
    const [ params, setParams ] = useSearchParams();
    // Each owner's group: the plugins that are on, then those turned off, whose patches come back with them.
    const owners = [ ...(data?.plugins ?? []) ].filter(plugin => plugin.key !== target).sort((a, b) => Number(b.state === 'loaded') - Number(a.state === 'loaded'));
    const files = useQueries({ queries: owners.filter(plugin => plugin.state === 'loaded').map(plugin => pluginTemplatePatchesQuery(plugin.key)) });
    const mineOutdated = hotel?.patches.filter(patch => !patch.disabled && isOutdated(index, patch)).length ?? 0;
    const pluginsOutdated = files.reduce((sum, file) => sum + (file.data?.patches.filter(patch => isOutdated(index, patch)).length ?? 0), 0);
    const outdated = mineOutdated + pluginsOutdated;
    const onlyOutdated = params.get('show') === 'outdated' && outdated > 0;

    return (
        <>
            <PageHeader title="Template patches" tabs={tabs} description="Changes to the game's windows, as data: yours and each plugin's, with what players' clients report of them" />
            <PageBody>
                <WorkingOnPicker className="card px-4 py-2.5" />
                {error && <ErrorNotice error={error} />}
                {outdated > 0 && (
                    <WarningNotice>
                        <span data-outdated={outdated}>
                            {`${plural(outdated, 'patch', 'patches')} ${outdated === 1 ? 'names' : 'name'} a window or an element this client no longer has: a client update renamed or removed it. Fix the key, or remove the patch. `}
                        </span>
                        <TextButton className="align-baseline" onClick={() => setParams(onlyOutdated ? {} : { show: 'outdated' }, { replace: true })}>
                            {onlyOutdated ? 'Show every patch' : `Show only ${outdated === 1 ? 'it' : 'them'}`}
                        </TextButton>
                    </WarningNotice>
                )}
                <HotelPatches onlyOutdated={onlyOutdated} />
                {(!onlyOutdated || pluginsOutdated > 0) && (
                    <Panel title="Plugins' patches" description="From each plugin's wwwroot/template-patches.json. Players get a change at their next load.">
                        {!data && !error && <Loading />}
                        <ul className="divide-y divide-line">{owners.map(plugin => <PluginPatches key={plugin.key} plugin={plugin} canManage={!!data?.canManage} onlyOutdated={onlyOutdated} />)}</ul>
                    </Panel>
                )}
            </PageBody>
        </>
    );
};
