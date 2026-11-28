import { CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { useSyncPreview } from '#/api/bundles';
import { type GamedataStatus, useCheckHabbo, useFigureImportPreview, useHabboVariableUpdate, useImportPreview, useProductImportPreview, useTextImportPreview } from '#/api/gamedata';
import { toast, toastError } from '#/components/toast';
import { Button, EmptyState, Label, Loading, PageBody, PageHeader, Panel } from '#/components/ui';
import { cx } from '#/lib/cx';
import { plural } from '#/lib/plural';
import { usePathTab } from '#/lib/tabs';
import { fromNow } from '#/lib/time';
import { BundleUpdate } from '#/pages/assets/BundleUpdate';

import { HabboFigures } from './FiguresTab';
import { Loaded } from './frame';
import { HabboFurniture } from './FurnitureTab';
import { HabboVariables } from './HabboVariables';
import { HistoryPanel } from './HistoryPanel';
import { HabboProducts } from './ProductsTab';
import { SourcesTab } from './SourcesTab';
import { useGamedata } from './state';
import { HabboTexts } from './TextsTab';
import { type Category, CATEGORY_GROUPS, LIBRARY_CATEGORIES } from './updates';

/** The categories, worked out from the same previews the library and texts pages show; before the gamedata is read, none. */
const useCategories = (status: GamedataStatus | undefined, canManage: boolean): Category[] => {
    const furniture = useImportPreview(!!status?.latestRelease);
    const figures = useFigureImportPreview(!!status?.latestFigures);
    const products = useProductImportPreview(!!status?.latestProducts);
    const texts = useTextImportPreview(!!status?.latestTexts);
    const variables = useHabboVariableUpdate(!!status?.latestVariables);
    const bundles = useSyncPreview(!!status);

    if (!status)
        return [];

    const unchecked = 'Habbo hasn\'t been checked yet.';

    const dataCount = (checked: boolean, data: { added: number; updated: number; kept: number } | undefined, extra = 0) =>
        checked && data ? data.added + data.updated + data.kept + extra : null;

    const bundleCategory = ({ kind, id, label, group }: typeof LIBRARY_CATEGORIES[number]): Category => {
        const entry = bundles.data?.kinds.find(x => x.kind === kind);

        return {
            id,
            label,
            group,
            count: entry?.listed ? entry.new + entry.updated : null,
            note: bundles.error ? 'Habbo couldn\'t be read.' : entry && !entry.listed ? 'Habbo\'s list couldn\'t be read.' : undefined,
            content: <BundleUpdate kind={kind} canManage={canManage} defaultOpen />,
        };
    };

    return [
        {
            id: 'furniture',
            label: 'Furniture data',
            group: 'Gamedata',
            count: dataCount(status.latestRelease !== null, furniture.data, furniture.data && furniture.data.filesToRead > 0 && furniture.data.added + furniture.data.updated + furniture.data.kept === 0 ? 1 : 0),
            note: status.latestRelease ? undefined : unchecked,
            content: <HabboFurniture status={status} defaultOpen />,
        },
        {
            id: 'figures',
            label: 'Figure data',
            group: 'Gamedata',
            count: dataCount(status.latestFigures !== null, figures.data),
            note: status.latestFigures ? undefined : unchecked,
            content: <HabboFigures status={status} defaultOpen />,
        },
        {
            id: 'products',
            label: 'Product data',
            group: 'Gamedata',
            count: dataCount(status.latestProducts !== null, products.data),
            note: status.latestProducts ? undefined : unchecked,
            content: <HabboProducts status={status} defaultOpen />,
        },
        {
            id: 'texts',
            label: 'Texts',
            group: 'Gamedata',
            count: dataCount(status.latestTexts !== null, texts.data),
            note: status.latestTexts ? undefined : unchecked,
            content: <HabboTexts status={status} defaultOpen />,
        },
        {
            id: 'variables',
            label: 'Variables',
            group: 'Gamedata',
            count: status.latestVariables && variables.data ? variables.data.items.length : null,
            note: status.latestVariables ? undefined : unchecked,
            content: <HabboVariables status={status} defaultOpen />,
        },
        ...LIBRARY_CATEGORIES.map(bundleCategory),
    ];
};

const NavButton = ({ category, active, onClick }: { category: Category; active: boolean; onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        aria-current={active}
        title={category.note}
        className={cx(
            'flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm transition-colors sm:min-h-8',
            active ? 'bg-accent-soft font-medium text-accent' : 'hover:bg-subtle',
        )}
    >
        <span className="truncate">{category.label}</span>
        <span className={cx('shrink-0 text-xs tabular-nums', category.count ? 'rounded-full bg-warn-soft px-1.5 font-semibold text-warn' : 'text-muted')}>
            {category.count === null ? '–' : category.count === 0 ? <CheckCircle2 className="size-3.5 text-good" /> : category.count.toLocaleString()}
        </span>
    </button>
);

/**
 * What Habbo has that the hotel hasn't taken in, as nitro-studio's updater lays it out: every kind
 * of data and bundle with what waits, those up to date folded away, and the one picked (or the one a
 * library page's link asked for), to review and take in. With nothing waiting, only that is said.
 */
const WaitingTab = ({ categories }: { categories: Category[] }) => {
    const [ params ] = useSearchParams();
    const waiting = categories.filter(x => x.count);
    const total = waiting.reduce((sum, x) => sum + x.count!, 0);
    const [ picked, setPicked ] = useState<string | null>(() => params.get('pick'));
    const [ showAll, setShowAll ] = useState(false);
    const selected = categories.find(x => x.id === picked) ?? waiting[0] ?? categories[0]!;
    const listed = categories.filter(x => showAll || x.count !== 0 || x.id === selected.id);
    const folded = categories.length - listed.length;

    // Nothing waits and nothing was asked for: say so, once every count is in (a count with a note never comes).
    if (waiting.length === 0 && picked === null && categories.every(x => x.count === 0 || !x.note)) {
        return categories.every(x => x.count === 0)
            ? <EmptyState framed icon={<CheckCircle2 className="text-good" />}>No updates. The hotel has everything Habbo serves.</EmptyState>
            : <Loading />;
    }

    return (
        <>
            <Panel
                title="Pending updates"
                description={total > 0 ? `${plural(total, 'update')} to take in. Each is taken in on its own, and can be rolled back from the history.` : 'Nothing waits to be taken in.'}
            >
                <div className="grid items-start lg:grid-cols-[14rem_minmax(0,1fr)]">
                    <nav aria-label="What to update" className="flex flex-col gap-3 border-b border-line p-2 lg:border-r lg:border-b-0">
                        {CATEGORY_GROUPS.map(group => listed.some(x => x.group === group) && (
                            <div key={group} className="flex flex-col gap-0.5">
                                <Label className="px-3 pt-1 pb-1">{group}</Label>
                                {listed.filter(x => x.group === group).map(category => (
                                    <NavButton key={category.id} category={category} active={category.id === selected.id} onClick={() => setPicked(category.id)} />
                                ))}
                            </div>
                        ))}
                        {(folded > 0 || showAll) && (
                            <button type="button" onClick={() => setShowAll(!showAll)} className="flex min-h-9 items-center gap-1.5 border-t border-line px-3 pt-2 text-xs text-muted hover:text-ink">
                                <ChevronDown className={cx('size-3.5 transition-transform', showAll && 'rotate-180')} />
                                {showAll ? 'Hide the ones up to date' : `${folded} up to date`}
                            </button>
                        )}
                    </nav>
                    {/* The picked one's own card, flush in the pane rather than a box in a box. */}
                    <div key={selected.id} className="min-w-0 [&>section]:rounded-none [&>section]:border-0">
                        {selected.note && selected.count === null && <p className="px-4 pt-3 text-sm text-muted">{selected.note}</p>}
                        {selected.content}
                    </div>
                </div>
            </Panel>
        </>
    );
};

/** Asks Habbo now, saying what it found. */
const CheckButton = () => {
    const check = useCheckHabbo();

    return (
        <Button
            variant="secondary"
            icon={<RefreshCw className={cx(check.isPending && 'animate-spin')} />}
            disabled={check.isPending}
            onClick={() => check.mutate(undefined, {
                onError: toastError,
                onSuccess: data => toast([
                    data.isNew ? `New release: ${data.release.revision}.` : null,
                    data.productsAreNew ? 'New product data.' : null,
                    data.textsAreNew ? 'New texts.' : null,
                    data.figuresAreNew ? 'New figure data.' : null,
                    data.variablesAreNew ? 'New variables.' : null,
                ].filter(Boolean).join(' ') || 'Nothing new: Habbo serves what was already found.'),
            })}
        >
            {check.isPending ? 'Checking' : 'Check Habbo'}
        </Button>
    );
};

const TABS = [ 'waiting', 'sources', 'history' ] as const;

/**
 * Habbo updates: what Habbo has that the hotel hasn't taken in (each to review and take in, the
 * data rolled back from the history if need be), where it comes from, and the history of the
 * gamedata Habbo serves (the variables' own edits are kept on their own tab).
 */
export const UpdatesPage = () => {
    const state = useGamedata();
    const [ tab, toTab ] = usePathTab(TABS);
    const categories = useCategories(state.status, state.canManage);

    if (toTab)
        return toTab;

    const total = categories.reduce((sum, x) => sum + (x.count ?? 0), 0);
    const release = state.status?.latestRelease;

    return (
        <>
            <PageHeader
                title="Habbo updates"
                description={release && `Habbo ${release.revision.replace(/^PRODUCTION-/, '')}, checked ${fromNow(release.checkedAt)}`}
                tabs={{
                    items: [
                        { value: 'waiting', label: 'Waiting', to: '/gamedata/updates/waiting', ...(total > 0 ? { count: total } : {}) },
                        { value: 'sources', label: 'Sources', to: '/gamedata/updates/sources' },
                        { value: 'history', label: 'History', to: '/gamedata/updates/history' },
                    ],
                    value: tab,
                }}
            >
                {state.canManage && <CheckButton />}
            </PageHeader>
            <PageBody>
                <Loaded state={state}>
                    {(status, assets) => (
                        <>
                            {tab === 'waiting' && <WaitingTab categories={categories} />}
                            {tab === 'sources' && <SourcesTab status={status} assets={assets} canManage={state.canManage} categories={categories} />}
                            {tab === 'history' && <HistoryPanel scope="habbo" canManage={status.canManage} />}
                        </>
                    )}
                </Loaded>
            </PageBody>
        </>
    );
};
