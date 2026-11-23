import { CopyPlus, Eye, FolderPen, ImageIcon, Layers, MoreHorizontal, Palette, Plus, Power, PowerOff, TriangleAlert, Users } from 'lucide-react';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { type PluginTheme, type ThemeAudience, useThemeAudiences, useThemes } from '#/api/appearance';
import { useClientAssets } from '#/api/assets';
import { type PluginActionResponse, type PluginState, useSetPluginEnabled } from '#/api/plugins';
import { folderOf, HOTEL, useWorkingOn } from '#/appearance/workingOn';
import { ask } from '#/components/confirm';
import { PhoneLabel, Row, RowList } from '#/components/RowList';
import { Sheet, SheetItem } from '#/components/Sheet';
import { toast, toastError } from '#/components/toast';
import { Badge, Button, ButtonLink, EmptyState, ErrorNotice, IconButton, Loading, PageBody, PageHeader } from '#/components/ui';
import { useHubTabs } from '#/layout/nav';
import { cx } from '#/lib/cx';
import { PLUGIN_STATES } from '#/pages/plugins/pluginStates';

import { NewThemeDialog } from './NewThemeDialog';
import { ThemeAudienceDialog } from './ThemeAudience';
import { audienceNames, hasLiveDefault, onwardLevels, previewLink, reachOf, themeName, themeTree } from './themes';
import { DefaultTag, ReachLine, StatusPill } from './ThemeTags';

/** A plugin action's answer as a toast: what it did, or why not. */
const said = { onSuccess: (answer: PluginActionResponse) => (answer.ok ? toast(answer.message) : toastError(new Error(answer.message))), onError: toastError };

const COLUMNS = 'minmax(0,1fr) 9rem minmax(0,14rem) 10rem auto';

const HEADERS = [ { label: 'Theme' }, { label: 'Status' }, { label: 'Gets it' }, { label: 'Style properties' }, {} ];

/** One level's indent in the tree, in rem: a theme's tile starts this much further in than its parent's. */
const STEP = 1.875;

/** Where a level's line runs, in rem from the start of its parent's indent: under the middle of the parent's tile (size-9). */
const LINE = 1.125;

/** Where the line of a level runs across a row, from the row's edge (its px-4 first). */
const lineAt = (level: number) => `calc(1rem + ${(level - 1) * STEP + LINE}rem)`;

/** A line of the tree: drawn over the row from a tablet up; on a phone, where a row wraps, the indent alone says it. */
const LINE_CLASS = 'pointer-events-none absolute max-sm:hidden';

/**
 * The tree's lines across one row, from a tablet up, where a row is one line and its tile at its
 * middle: a line down through it for each level above it that goes on below, and its own elbow
 * into its tile (a corner when it is the last under its parent, a tee when another follows).
 */
const TreeLines = ({ depth, onward }: { depth: number; onward: boolean[] }) => (
    // Each line on its own, out of the row's flow: a box around them would be a flex item, and the row's gap would push the tile in.
    <>
        {onward.slice(0, depth - 1).map((on, index) => on && <span key={index} aria-hidden className={cx(LINE_CLASS, 'inset-y-0 w-px bg-line-strong')} style={{ left: lineAt(index + 1) }} />)}
        {onward[depth - 1]
            ? (
                    <>
                        <span aria-hidden className={cx(LINE_CLASS, 'inset-y-0 w-px bg-line-strong')} style={{ left: lineAt(depth) }} />
                        <span aria-hidden className={cx(LINE_CLASS, 'top-1/2 h-px w-3 bg-line-strong')} style={{ left: lineAt(depth) }} />
                    </>
                )
            : <span aria-hidden className={cx(LINE_CLASS, 'top-0 h-[calc(50%+1px)] w-3 rounded-bl-md border-b border-l border-line-strong')} style={{ left: lineAt(depth) }} />}
    </>
);

/** The square a theme's icon sits in, before its name: in the accent for the theme staff work on. */
const Tile = ({ children, active }: { children: ReactNode; active?: boolean }) => (
    <span aria-hidden className={cx('grid size-9 shrink-0 place-items-center rounded-lg [&>svg]:size-4', active ? 'bg-accent-soft text-accent' : 'bg-subtle text-muted')}>{children}</span>
);

/** Where a theme stands: whether players get it (Live, In development, Off), or what its plugin is when it is not running. */
const StatusTag = ({ theme, audience }: { theme: PluginTheme; audience: ThemeAudience | undefined }) => {
    if (theme.state !== 'loaded') {
        const state = PLUGIN_STATES[theme.state as PluginState] ?? PLUGIN_STATES.not_loaded;

        return <Badge tone={state.tone}>{`plugin ${state.label}`}</Badge>;
    }

    if (!audience) return <span className="text-muted">-</span>;

    return <StatusPill status={audience.status} />;
};

/** Who draws it, in a few words; the whole list on hover when it is long. */
const Reach = ({ theme, audience, hasDefault }: { theme: PluginTheme; audience: ThemeAudience | undefined; hasDefault: boolean }) => {
    const named = audience?.status === 'development' ? audienceNames(audience) : [];

    return <ReachLine words={theme.state === 'loaded' && audience ? reachOf(audience, hasDefault) : 'No one'} title={named.length > 1 ? named.join(', ') : undefined} />;
};

/** One theme: where it sits in the tree, whether players get it and who, its style properties, and its actions. */
const ThemeRow = ({ theme, depth, onward, audience, hasDefault, known, onMore }: {
    theme: PluginTheme;
    depth: number;
    onward: boolean[];
    audience: ThemeAudience | undefined;
    hasDefault: boolean;
    known: boolean;
    onMore: () => void;
}) => {
    const working = useWorkingOn();
    const workingOn = working.key === theme.key;
    const name = themeName(theme);

    return (
        <Row className={cx('relative', workingOn && 'bg-accent-soft/50 hover:bg-accent-soft/70')}>
            {/* Indented a level a step from a tablet up, where the tree's lines are drawn; on a phone a little, the lines left out. */}
            <div className="flex min-w-0 items-center gap-3 pl-[calc(var(--depth)*0.75rem)] sm:pl-[calc(var(--depth)*var(--step))]" style={{ '--depth': depth, '--step': `${STEP}rem` } as CSSProperties} data-theme={theme.key}>
                {depth > 0 && <TreeLines depth={depth} onward={onward} />}
                <Tile active={workingOn}><Palette /></Tile>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{name}</span>
                        {audience?.isDefault && <DefaultTag />}
                        {workingOn && <Badge><FolderPen aria-hidden className="size-3" />working on</Badge>}
                    </div>
                    <div className="truncate font-mono text-xs text-muted">
                        {theme.key}
                        {theme.extends && !known && <span className="text-warn">{` · extends ${theme.extends}, not installed`}</span>}
                    </div>
                    {theme.error && (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-bad">
                            <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                            {theme.error}
                        </p>
                    )}
                </div>
            </div>
            <div><StatusTag theme={theme} audience={audience} /></div>
            <Reach theme={theme} audience={audience} hasDefault={hasDefault} />
            <div className="text-ui" title={theme.error ? undefined : `${theme.styles} style properties: ${theme.own} declared by this theme, ${theme.changed} changed by this hotel`}>
                {theme.error
                    ? <span className="text-muted">-</span>
                    : (
                            <>
                                <PhoneLabel>Style properties </PhoneLabel>
                                <span className="font-mono tabular-nums">{theme.styles}</span>
                                <span className="text-xs text-muted max-sm:hidden">{` · ${theme.own} own · ${theme.changed} changed`}</span>
                            </>
                        )}
            </div>
            <div className="ml-auto flex items-center justify-end gap-1">
                <ButtonLink small to={`/appearance/studio?${new URLSearchParams({ tab: 'settings', theme: theme.key })}`} icon={<Palette />}>Edit</ButtonLink>
                <IconButton small label={`More for ${name}`} icon={<MoreHorizontal />} onClick={onMore} />
            </div>
        </Row>
    );
};

/** The rest of what can be done with a theme, in a sheet: work on it, who gets it, preview it, its files, copy it, turn it off or on. */
const ThemeActions = ({ theme, audience, canManage, onClose, onAudience, onDuplicate }: {
    theme: PluginTheme | undefined;
    audience: ThemeAudience | undefined;
    canManage: boolean;
    onClose: () => void;
    onAudience: () => void;
    onDuplicate: () => void;
}) => {
    const navigate = useNavigate();
    const working = useWorkingOn();
    const assets = useClientAssets();
    const setEnabled = useSetPluginEnabled();
    const link = theme && audience && audience.status !== 'off' ? previewLink(assets?.preview, theme.key) : null;
    const go = (to: string) => {
        onClose();
        void navigate(to);
    };

    return (
        <Sheet title={theme ? themeName(theme) : ''} open={!!theme} onClose={onClose}>
            {theme && (
                <>
                    {canManage && working.key !== theme.key && (
                        <SheetItem
                            icon={<FolderPen />}
                            onClick={() => {
                                working.setKey(theme.key);
                                toast(`Working on ${themeName(theme)}: every appearance edit saves into ${folderOf(theme.key)}`);
                                onClose();
                            }}
                        >
                            Work on it
                        </SheetItem>
                    )}
                    {canManage && audience && <SheetItem icon={<Users />} onClick={onAudience}>Who gets it</SheetItem>}
                    {link && (
                        <SheetItem
                            icon={<Eye />}
                            onClick={() => {
                                window.open(link, '_blank', 'noopener,noreferrer');
                                onClose();
                            }}
                        >
                            Preview as this theme
                        </SheetItem>
                    )}
                    <SheetItem icon={<ImageIcon />} onClick={() => go(`/appearance/images/${encodeURIComponent(theme.key)}`)}>Images</SheetItem>
                    <SheetItem icon={<Layers />} onClick={() => go(`/appearance/patches#${encodeURIComponent(theme.key)}`)}>Template patches</SheetItem>
                    {canManage && <SheetItem icon={<CopyPlus />} onClick={onDuplicate}>Duplicate</SheetItem>}
                    {canManage && theme.key !== HOTEL && (theme.state === 'loaded'
                        ? (
                                <SheetItem
                                    icon={<PowerOff />}
                                    tone="bad"
                                    onClick={() => {
                                        onClose();
                                        ask(
                                            { title: `Turn ${themeName(theme)} off?`, body: 'Its styles, patches and images are taken away from the players drawing it as it is turned off.', confirm: 'Turn off' },
                                            () => setEnabled.mutate({ key: theme.key, enabled: false }, said),
                                        );
                                    }}
                                >
                                    Turn off
                                </SheetItem>
                            )
                        : (
                                <SheetItem
                                    icon={<Power />}
                                    onClick={() => {
                                        onClose();
                                        setEnabled.mutate({ key: theme.key, enabled: true }, said);
                                    }}
                                >
                                    Turn on
                                </SheetItem>
                            ))}
                </>
            )}
        </Sheet>
    );
};

/**
 * The themes as a tree (XenForo's Styles): Habbo's own look at the root, each theme under the one it
 * extends, with whether players get it and who, its style properties, and Edit; the rest of what can
 * be done with one is under its "More". The theme staff work on, where every appearance editor
 * saves, is tinted.
 */
export const ThemesPage = () => {
    const tabs = useHubTabs('themes');
    const { data, error } = useThemes();
    const audiences = useThemeAudiences().data;
    const working = useWorkingOn();
    const tree = data ? themeTree(data.themes, data.base) : [];
    const onward = onwardLevels(tree);
    const keys = new Set(data?.themes.map(theme => theme.key));
    const themeOf = (key: string | null) => data?.themes.find(theme => theme.key === key);
    const audienceOf = (key: string | null) => audiences?.themes.find(theme => theme.key === key);
    // With no default, a Live theme is every player's (docs/plugin-data.md, "Who gets which theme").
    const hasDefault = hasLiveDefault(audiences?.themes);
    const [ params, setParams ] = useSearchParams();
    const [ moreKey, setMoreKey ] = useState<string | null>(null);
    const [ audienceKey, setAudienceKey ] = useState<string | null>(null);
    const editing = audienceOf(audienceKey);
    const canManage = !!data?.canManage;
    // ?new=1 opens New theme (the Working on picker links here), ?copy=<key> Duplicate.
    const making = params.has('new') || params.has('copy');
    const closeMaking = () => setParams({}, { replace: true });

    return (
        <>
            <PageHeader title="Themes" tabs={tabs}>
                {canManage && <Button icon={<Plus />} onClick={() => setParams({ new: '1' }, { replace: true })}>New theme</Button>}
            </PageHeader>
            <PageBody>
                {error && <ErrorNotice error={error} />}
                {!data && !error && <Loading />}
                {data && (
                    <section aria-label="Themes" className="card overflow-clip">
                        <RowList columns={COLUMNS} headers={HEADERS}>
                            <Row className="relative hover:bg-transparent">
                                <div className="flex min-w-0 items-center gap-3">
                                    {/* The tree's first line, from Habbo's own down to the themes that extend it. */}
                                    {tree.some(node => node.depth === 1) && <span aria-hidden className={cx(LINE_CLASS, 'top-[calc(50%+1.125rem)] bottom-0 w-px bg-line-strong')} style={{ left: lineAt(1) }} />}
                                    <Tile><Layers /></Tile>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium">Habbo&apos;s own</span>
                                            <Badge>built in</Badge>
                                        </div>
                                        <div className="truncate font-mono text-xs text-muted">{data.base}</div>
                                    </div>
                                </div>
                                <p className="text-ui text-muted sm:col-span-4">The look every theme starts from: each style property is the client&apos;s own until a theme or staff set it.</p>
                            </Row>
                            {tree.map(({ theme, depth }, index) => (
                                <ThemeRow
                                    key={theme.key}
                                    theme={theme}
                                    depth={depth}
                                    onward={onward[index]!}
                                    audience={audienceOf(theme.key)}
                                    hasDefault={hasDefault}
                                    known={!theme.extends || theme.extends === data.base || keys.has(theme.extends)}
                                    onMore={() => setMoreKey(theme.key)}
                                />
                            ))}
                        </RowList>
                        {tree.length === 0 && <EmptyState>No theme yet.</EmptyState>}
                        <p className="flex items-start gap-2 border-t border-line bg-subtle/40 px-4 py-2.5 text-xs text-muted">
                            <FolderPen aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                                {`Every appearance edit saves into ${folderOf(working.key)}, the theme you work on (${working.name}). A theme is a data plugin with a theme.json; this hotel's own changes are the theme "This hotel", which extends Habbo's.`}
                            </span>
                        </p>
                    </section>
                )}
                <NewThemeDialog open={making} copyOf={params.get('copy')} onClose={closeMaking} />
                <ThemeActions
                    theme={themeOf(moreKey)}
                    audience={audienceOf(moreKey)}
                    canManage={canManage}
                    onClose={() => setMoreKey(null)}
                    onAudience={() => {
                        setAudienceKey(moreKey);
                        setMoreKey(null);
                    }}
                    onDuplicate={() => {
                        setParams({ copy: moreKey ?? '' }, { replace: true });
                        setMoreKey(null);
                    }}
                />
                {editing && (
                    <ThemeAudienceDialog
                        key={editing.key}
                        audience={editing}
                        name={themeName(themeOf(editing.key) ?? { key: editing.key, name: null })}
                        groups={audiences?.groups ?? []}
                        onClose={() => setAudienceKey(null)}
                    />
                )}
            </PageBody>
        </>
    );
};
