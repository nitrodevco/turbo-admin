import {
    closestCenter,
    type CollisionDetection,
    DndContext,
    type DragEndEvent,
    type DragMoveEvent,
    DragOverlay,
    type DragStartEvent,
    KeyboardSensor,
    MouseSensor,
    pointerWithin,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Disc3, FileText, FolderPlus, Package, Send, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import {
    catalogCalls,
    type CatalogPageDetail,
    type CatalogTree,
    CLUB_BUY,
    CLUB_GIFTS,
    CLUB_GIFTS_PAGE_NAME,
    CLUB_PAGE_NAME,
    useCatalogEdit,
    useCatalogFeatured,
    useCatalogPage,
    useCatalogTree,
} from '#/api/catalog';
import { Badge, Button, EmptyState, ErrorNotice, Loading, PageBody, PageHeader, Panel, WarningNotice } from '#/components/ui';
import { cx } from '#/lib/cx';

import { FeaturedEditor } from './FeaturedEditor';
import { celebrate, toast, toastError } from './feedback';
import { DISPLAY_LABELS } from './labels';
import { layoutOf } from './layouts';
import { OfferInspector, type OfferStart } from './OfferInspector';
import { offerKey } from './offers';
import { OfferFace } from './OfferTile';
import { PageBuilder } from './PageBuilder';
import { type PageDraft, pageDraftOf } from './pageDraft';
import { PageInspector } from './PageInspector';
import { PagePreview, type SlotRef } from './PagePreview';
import { PageRowBody, PageTree } from './PageTree';
import { Toasts } from './Toasts';
import { ancestorsOf, childrenOf } from './tree';
import { flatten, movePageIn, project } from './treeDrag';

/** What a new offer starts as on a page of this layout. */
const startOf = (layout: string): OfferStart => (layout === CLUB_BUY ? 'membership' : layout === CLUB_GIFTS ? 'gift' : 'item');

/** What is being dragged: a page from the tree, or an offer from the page. */
type Dragging = { kind: 'page'; id: number } | { kind: 'offer'; id: number };

const idOf = (dragId: string | number) => Number(String(dragId).split(':')[1]);
const kindOf = (dragId: string | number) => String(dragId).split(':')[0];

/**
 * Who a dragged thing can land on: a page only among the pages; an offer on a page in the tree when
 * the pointer is over one, and otherwise among the offers.
 */
const collision: CollisionDetection = (args) => {
    const kind = args.active.data.current?.kind;
    const pages = args.droppableContainers.filter(x => x.data.current?.kind === 'page');

    if (kind === 'page')
        return closestCenter({ ...args, droppableContainers: pages });

    const overPage = pointerWithin({ ...args, droppableContainers: pages });

    if (overPage.length > 0)
        return overPage;

    return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(x => x.data.current?.kind === 'offer') });
};

/**
 * What is missing for players to reach the club shop: memberships on offer with no shown page the
 * client's club buttons open (link key hc_membership), or club gifts with no shown club_gifts page
 * to list them; and adding one, with the layout that shows them.
 */
const ClubShopNotices = ({ tree, busy, onAdd }: { tree: CatalogTree; busy: boolean; onAdd: (title: string, name: string, layout: string) => void }) => {
    const club = tree.club;

    return (
        <>
            {club.memberships > 0 && club.clubBuyPageId === null && (
                <WarningNotice>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span>{club.memberships} {club.memberships === 1 ? 'membership is' : 'memberships are'} on offer, but no shown page has the link key {CLUB_PAGE_NAME}, which the client's club buttons open, so players can't reach the club window.</span>
                        {tree.canManage && <Button variant="secondary" disabled={busy} onClick={() => onAdd('Habbo Club', CLUB_PAGE_NAME, CLUB_BUY)} className="h-8 sm:h-8">Add a Habbo Club page</Button>}
                    </span>
                </WarningNotice>
            )}
            {club.gifts > 0 && club.clubGiftsPageId === null && (
                <WarningNotice>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span>{club.gifts} club {club.gifts === 1 ? 'gift is' : 'gifts are'} on offer, but no shown page has the link key {CLUB_GIFTS_PAGE_NAME}, which the client opens to list them.</span>
                        {tree.canManage && <Button variant="secondary" disabled={busy} onClick={() => onAdd('Club Gifts', CLUB_GIFTS_PAGE_NAME, CLUB_GIFTS)} className="h-8 sm:h-8">Add a club gifts page</Button>}
                    </span>
                </WarningNotice>
            )}
        </>
    );
};

type InspectorTab = 'page' | 'offer' | 'featured';

/**
 * The catalog editor: the page tree on the left, the picked page in the middle drawn as the client
 * draws it, and on the right what is being edited - the page, an offer, or the front page's featured
 * items. Pages are dragged about the tree; offers about their page, or onto another page in the
 * tree. Edits are stored as they are saved and go in front of players when published, which
 * reloads the catalog and tells everyone online to refresh it. Both catalogs are cut from the one
 * tree, by where each page is shown. The open page and offer live in the address, so they can be
 * linked to.
 */
export const CatalogPage = () => {
    const [ params, setParams ] = useSearchParams();
    const selected = Number(params.get('page')) || null;
    const offerParam = params.get('offer');
    const selectedOffer: number | 'new' | null = offerParam === 'new' ? 'new' : Number(offerParam) || null;
    const tree = useCatalogTree();
    const page = useCatalogPage(selected);
    const featured = useCatalogFeatured();
    const publish = useCatalogEdit(catalogCalls.publish);
    const addPage = useCatalogEdit(catalogCalls.createPage);
    const movePage = useCatalogEdit(catalogCalls.movePage);
    const moveOffer = useCatalogEdit(catalogCalls.moveOffer);
    const queryClient = useQueryClient();
    const data = tree.data;
    const publishButton = useRef<HTMLDivElement>(null);

    const [ open, setOpen ] = useState<Set<number>>(() => new Set(selected && data ? ancestorsOf(data, selected).map(x => x.id) : []));
    const [ tab, setTab ] = useState<InspectorTab>(selectedOffer ? 'offer' : 'page');
    const [ focus, setFocus ] = useState<(SlotRef & { at: number }) | null>(null);
    const [ dragging, setDragging ] = useState<Dragging | null>(null);
    const [ overPage, setOverPage ] = useState<number | null>(null);
    const [ offsetX, setOffsetX ] = useState(0);
    const [ building, setBuilding ] = useState(false);

    // The page's edit, kept until it is saved or the page changes underneath it.
    const savedKey = page.data ? JSON.stringify(pageDraftOf(page.data)) + page.data.id : '';
    const [ pageEdit, setPageEdit ] = useState<{ key: string; draft: PageDraft } | null>(null);
    const draft = page.data ? (pageEdit?.key === savedKey ? pageEdit.draft : pageDraftOf(page.data)) : null;
    const setDraft = (next: PageDraft) => setPageEdit({ key: savedKey, draft: next });

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
        // Space picks a page or a tile up; Enter is left to open what has the focus.
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: [ 'Space' ], cancel: [ 'Escape' ], end: [ 'Space', 'Enter' ] } }),
    );

    // Opening a page opens the pages above it in the tree, so it is in sight.
    const openPage = (id: number | null, offer?: number | 'new') => {
        const next = new URLSearchParams();

        if (id && id !== data?.rootId)
            next.set('page', String(id));

        if (offer)
            next.set('offer', String(offer));

        setParams(next);
        setTab(offer ? 'offer' : 'page');
        publish.reset();

        if (id && data)
            setOpen(current => new Set([ ...current, ...ancestorsOf(data, id).map(x => x.id) ]));
    };

    const selectOffer = (id: number | 'new' | null) => {
        const next = new URLSearchParams(params);

        if (id)
            next.set('offer', String(id));
        else
            next.delete('offer');

        setParams(next, { replace: true });
        setTab(id ? 'offer' : 'page');
    };

    const rows = useMemo(() => (data ? flatten(data, open, dragging?.kind === 'page' ? dragging.id : undefined) : []), [ data, open, dragging ]);
    const projection = data && dragging?.kind === 'page' && overPage ? project(rows, dragging.id, overPage, offsetX, data.rootId) : null;

    const onDragStart = ({ active }: DragStartEvent) => {
        setDragging({ kind: kindOf(active.id) as Dragging['kind'], id: idOf(active.id) });
        setOverPage(kindOf(active.id) === 'page' ? idOf(active.id) : null);
        setOffsetX(0);
    };

    const onDragMove = ({ delta, over }: DragMoveEvent) => {
        setOffsetX(delta.x);
        setOverPage(over && kindOf(over.id) === 'page' ? idOf(over.id) : null);
    };

    const endDrag = () => {
        setDragging(null);
        setOverPage(null);
        setOffsetX(0);
    };

    const onDragEnd = ({ over }: DragEndEvent) => {
        const was = dragging;
        const landing = projection;

        endDrag();

        if (!data || !was || !over)
            return;

        if (was.kind === 'page' && landing) {
            const page = data.pages.find(x => x.id === was.id);
            const siblings = (childrenOf(data).get(landing.parentId) ?? []).filter(x => x.id !== was.id);
            const unchanged = page?.parentId === landing.parentId && (childrenOf(data).get(landing.parentId) ?? []).findIndex(x => x.id === was.id) === landing.index;

            if (unchanged || !page)
                return;

            const parent = landing.parentId === data.rootId ? 'the top level' : data.pages.find(x => x.id === landing.parentId)?.localization;

            queryClient.setQueryData<CatalogTree>([ 'catalog', 'tree' ], current => (current ? movePageIn(current, was.id, landing.parentId, landing.index) : current));

            if (landing.parentId !== data.rootId)
                setOpen(current => new Set(current).add(landing.parentId));

            movePage.mutate([ was.id, landing.parentId, Math.min(landing.index, siblings.length) ], {
                onSuccess: () => toast(`Moved ${page.localization} into ${parent}.`),
                onError: toastError,
            });

            return;
        }

        if (was.kind !== 'offer' || !page.data)
            return;

        const fromPage = page.data;
        const offer = fromPage.offers.find(x => x.id === was.id);

        if (!offer)
            return;

        // Onto a page in the tree: it goes to the end of that page.
        if (kindOf(over.id) === 'page') {
            const target = idOf(over.id);
            const targetPage = data.pages.find(x => x.id === target);

            if (target === fromPage.id || !targetPage)
                return;

            queryClient.setQueryData<CatalogPageDetail>([ 'catalog', 'page', fromPage.id ], current => (current ? { ...current, offers: current.offers.filter(x => x.id !== offer.id) } : current));

            if (selectedOffer === offer.id)
                selectOffer(null);

            moveOffer.mutate([ offer.id, target, targetPage.offerCount ], {
                onSuccess: () => toast(`Moved the offer to ${targetPage.localization}.`),
                onError: toastError,
            });

            return;
        }

        // Among the page's own offers: it takes the place of the one it was dropped on.
        const from = fromPage.offers.findIndex(x => x.id === offer.id);
        const to = fromPage.offers.findIndex(x => x.id === idOf(over.id));

        if (to < 0 || from === to)
            return;

        queryClient.setQueryData<CatalogPageDetail>([ 'catalog', 'page', fromPage.id ], current => (current ? { ...current, offers: arrayMove(current.offers, from, to) } : current));
        moveOffer.mutate([ offer.id, fromPage.id, to ], { onError: toastError });
    };

    const addUnder = (parentId: number) => addPage.mutate(
        [ { parentId, localization: 'New page', name: null, icon: 0, layout: 'default_3x3', imageData: [], textData: [], display: 'invisible' } ],
        {
            onSuccess: (saved) => {
                toast('Added a hidden page, ready to set up.');
                openPage(saved.id);
            },
            onError: toastError,
        },
    );

    const unpublished = data?.unpublishedChanges ?? 0;
    const path = data && selected ? ancestorsOf(data, selected).map(x => x.localization).reverse() : [];
    const spec = draft ? layoutOf(draft.layout) : null;
    const isFeatured = spec?.kind === 'featured';
    const offer = page.data && typeof selectedOffer === 'number' ? page.data.offers.find(x => x.id === selectedOffer) ?? null : null;
    const shownTab: InspectorTab = tab === 'offer' && !selectedOffer ? 'page' : tab === 'featured' && !isFeatured ? 'page' : tab;
    const draggedPage = dragging?.kind === 'page' ? data?.pages.find(x => x.id === dragging.id) : undefined;
    const draggedOffer = dragging?.kind === 'offer' ? page.data?.offers.find(x => x.id === dragging.id) : undefined;

    return (
        <>
            <PageHeader
                title="Catalog"
                description={data ? `${data.pages.length.toLocaleString()} pages${unpublished > 0 ? ` · ${unpublished} ${unpublished === 1 ? 'change' : 'changes'} waiting to go live` : ' · everything is live'}` : 'Pages, offers and prices'}
            >
                <Link to="/catalog/songs" className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-subtle px-3.5 text-sm font-medium hover:border-muted/50 sm:h-9 [&>svg]:size-4">
                    <Disc3 />
                    Songs
                </Link>
                {data?.canManage && (
                    <div ref={publishButton}>
                        <Button
                            icon={<Send />}
                            variant={unpublished > 0 ? 'primary' : 'secondary'}
                            disabled={publish.isPending}
                            onClick={() => window.confirm('Publish the catalog? Everyone online gets the new catalog at once.') && publish.mutate([], {
                                onSuccess: (result) => {
                                    celebrate(publishButton.current);
                                    toast(`Live! ${result.offers.toLocaleString()} offers on ${result.pages.toLocaleString()} pages; ${result.playersTold} ${result.playersTold === 1 ? 'player' : 'players'} told to refresh.`);
                                },
                                onError: toastError,
                            })}
                        >
                            Publish{unpublished > 0 ? ` (${unpublished})` : ''}
                        </Button>
                    </div>
                )}
            </PageHeader>
            <PageBody className="flex flex-col gap-4">
                {tree.error && <ErrorNotice error={tree.error} />}
                {tree.isPending && <Loading />}
                {data && (
                    <ClubShopNotices
                        tree={data}
                        busy={addPage.isPending}
                        onAdd={(title, name, layout) => addPage.mutate(
                            [ { parentId: data.rootId, localization: title, name, icon: 0, layout, imageData: [], textData: [], display: 'regular' } ],
                            { onSuccess: saved => openPage(saved.id), onError: toastError },
                        )}
                    />
                )}
                {data && (
                    data.rootId === 0
                        ? <EmptyState>This catalog has no pages.</EmptyState>
                        : (
                                <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={endDrag}>
                                    <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_25rem]">
                                        <Panel
                                            title="Pages"
                                            actions={data.canManage && (
                                                <button type="button" onClick={() => addUnder(data.rootId)} title="Add a page at the top level" aria-label="Add a page at the top level" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-accent">
                                                    <FolderPlus className="size-4" />
                                                </button>
                                            )}
                                            className={cx('lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto', selected !== null && 'max-lg:hidden')}
                                        >
                                            <div className="p-2">
                                                <PageTree
                                                    tree={data}
                                                    rows={rows}
                                                    open={open}
                                                    selected={selected}
                                                    projection={projection}
                                                    onToggle={id => setOpen((current) => {
                                                        const next = new Set(current);

                                                        if (!next.delete(id))
                                                            next.add(id);

                                                        return next;
                                                    })}
                                                    onSelect={id => openPage(id)}
                                                    onAddUnder={addUnder}
                                                />
                                            </div>
                                            {data.canManage && <p className="border-t border-line px-3 py-2 text-[11px] text-muted">Drag by the grip to move a page; sideways to nest it. Drop an offer on a page to move it there.</p>}
                                        </Panel>

                                        {selected === null
                                            ? (
                                                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-16 text-center text-muted max-lg:hidden xl:col-span-2">
                                                        <Sparkles className="size-8 text-accent" />
                                                        <p className="text-sm">Pick a page to see it as players do, and to change it.</p>
                                                    </div>
                                                )
                                            : (
                                                    <>
                                                        <div className="flex min-w-0 flex-col gap-3">
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                <Button variant="ghost" icon={<ArrowLeft />} onClick={() => openPage(null)} className="lg:hidden">Pages</Button>
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-xs text-muted">{path.join(' / ') || 'Top level'}</div>
                                                                    <div className="truncate font-semibold">{draft?.localization ?? '…'}</div>
                                                                </div>
                                                                <span className="ml-auto flex shrink-0 items-center gap-2">
                                                                    {draft && draft.display !== 'regular' && <Badge>{DISPLAY_LABELS[draft.display]}</Badge>}
                                                                    {data.canManage && page.data && <Button variant="secondary" icon={<Wand2 />} onClick={() => setBuilding(true)} title="Fill this page from the hotel's furniture, pets and effects">Build</Button>}
                                                                </span>
                                                            </div>
                                                            {page.error && <ErrorNotice error={page.error} />}
                                                            {page.isPending && <Loading />}
                                                            {page.data && draft && (
                                                                <PagePreview
                                                                    tree={data}
                                                                    page={page.data}
                                                                    draft={draft}
                                                                    featured={featured.data?.items ?? []}
                                                                    selectedOffer={selectedOffer}
                                                                    onSelectOffer={id => selectOffer(selectedOffer === id ? null : id)}
                                                                    onAddOffer={() => selectOffer('new')}
                                                                    onEditSlot={(slot) => {
                                                                        const at = Date.now();

                                                                        setTab('page');
                                                                        setFocus({ ...slot, at });
                                                                        // The field stays lit a moment, to be found.
                                                                        setTimeout(() => setFocus(current => (current?.at === at ? null : current)), 2500);
                                                                    }}
                                                                    onEditFeatured={() => setTab('featured')}
                                                                />
                                                            )}
                                                        </div>

                                                        {page.data && draft && (
                                                            <Panel className="overflow-clip lg:col-start-2 xl:sticky xl:top-6 xl:col-start-auto xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto">
                                                                <div role="tablist" aria-label="Editing" className="flex gap-1 border-b border-line p-1.5">
                                                                    {[
                                                                        { value: 'page' as const, label: 'Page', icon: <FileText />, shown: true },
                                                                        { value: 'offer' as const, label: selectedOffer === 'new' ? 'New offer' : 'Offer', icon: <Package />, shown: selectedOffer !== null },
                                                                        { value: 'featured' as const, label: 'Featured', icon: <Sparkles />, shown: isFeatured },
                                                                    ].filter(x => x.shown).map(x => (
                                                                        <button
                                                                            key={x.value}
                                                                            type="button"
                                                                            role="tab"
                                                                            aria-selected={shownTab === x.value}
                                                                            onClick={() => setTab(x.value)}
                                                                            className={cx(
                                                                                'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors [&>svg]:size-4',
                                                                                shownTab === x.value ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-subtle hover:text-ink',
                                                                            )}
                                                                        >
                                                                            {x.icon}
                                                                            {x.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                {shownTab === 'page' && (
                                                                    <PageInspector tree={data} page={page.data} draft={draft} onDraft={setDraft} focus={focus} onOpen={openPage} />
                                                                )}
                                                                {shownTab === 'offer' && selectedOffer !== null && (selectedOffer === 'new' || offer) && (
                                                                    <OfferInspector
                                                                        key={selectedOffer === 'new' ? `new:${page.data.id}` : offerKey(offer)}
                                                                        tree={data}
                                                                        pageId={page.data.id}
                                                                        offer={offer}
                                                                        start={startOf(page.data.layout)}
                                                                        onDone={() => selectOffer(null)}
                                                                        onCreated={id => selectOffer(id)}
                                                                    />
                                                                )}
                                                                {shownTab === 'featured' && featured.data && (
                                                                    <FeaturedEditor key={JSON.stringify(featured.data.items)} tree={data} items={featured.data.items} />
                                                                )}
                                                                {shownTab === 'featured' && featured.error && <div className="p-4"><ErrorNotice error={featured.error} /></div>}
                                                            </Panel>
                                                        )}
                                                    </>
                                                )}
                                    </div>
                                    <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }}>
                                        {draggedPage && (
                                            <div className="flex h-9 w-64 rotate-1 items-center gap-2 rounded-lg border border-accent bg-surface px-3 text-sm shadow-xl">
                                                <PageRowBody page={draggedPage} />
                                            </div>
                                        )}
                                        {draggedOffer && data && (
                                            <div className="flex w-24 -rotate-3 flex-col items-center gap-1 rounded-xl border border-accent bg-surface p-1.5 shadow-2xl">
                                                <OfferFace offer={draggedOffer} tree={data} />
                                            </div>
                                        )}
                                    </DragOverlay>
                                </DndContext>
                            )
                )}
            </PageBody>
            {data && page.data && <PageBuilder key={page.data.id} tree={data} page={page.data} open={building} onClose={() => setBuilding(false)} />}
            <Toasts />
        </>
    );
};
