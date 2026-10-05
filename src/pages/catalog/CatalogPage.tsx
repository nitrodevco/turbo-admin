import { ArrowLeft, ChevronDown, EyeOff, Hammer, Plus, Send, Store } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { catalogCalls, type CatalogKind, type CatalogOffer, type CatalogTree, CLUB_BUY, CLUB_GIFTS, useCatalogEdit, useCatalogPage, useCatalogTree } from '#/api/catalog';
import type { TabItem } from '#/components/Tabs';
import { Badge, Button, EmptyState, ErrorNotice, Loading, PageBody, PageHeader, Panel, SuccessNotice, WarningNotice } from '#/components/ui';
import { cx } from '#/lib/cx';

import { lengthOf } from './labels';
import { OfferEditor, type OfferStart } from './OfferEditor';
import { PageSettings } from './PageSettings';
import { PageIcon, PageTree } from './PageTree';
import { ancestorsOf } from './tree';

const KINDS: TabItem[] = [
    { value: 'normal', label: 'Catalog', icon: <Store />, to: '/catalog' },
    { value: 'builders', label: 'Builders Club', icon: <Hammer />, to: '/catalog?type=builders' },
];

const CLUB = [ '', 'club', 'VIP' ];

/** What an offer gives, in a few words: the item, the badge, the membership, or what else it is. */
const givesOf = (offer: CatalogOffer) =>
    offer.products.map((x) => {
        if (x.subscriptionType)
            return `${x.subscriptionType === 'BuildersClub' ? 'Builders Club' : 'Habbo Club'}, ${lengthOf(x.subscriptionDays)}`;

        return `${x.quantity > 1 ? `${x.quantity} × ` : ''}${x.definitionName ?? x.extraParam ?? x.type}`;
    }).join(', ') || 'nothing';

/** What a new offer starts as on a page of this layout. */
const startOf = (layout: string): OfferStart => (layout === CLUB_BUY ? 'membership' : layout === CLUB_GIFTS ? 'gift' : 'item');

/** What a club page shows, which is not its own offers. */
const PAGE_NOTES: Record<string, (tree: CatalogTree) => string> = {
    [CLUB_BUY]: tree => `This page is the club window: it lists every shown membership, wherever it is (${tree.club?.memberships ?? 0} now), and sells them from here.`,
    [CLUB_GIFTS]: tree => `This page lists the club gifts members claim: every shown gift, wherever it is (${tree.club?.gifts ?? 0} now).`,
};

const priceOf = (offer: CatalogOffer, tree: CatalogTree) => {
    const parts = [];

    if (offer.costCredits > 0)
        parts.push(`${offer.costCredits.toLocaleString()} credits`);

    if (offer.costCurrency > 0)
        parts.push(`${offer.costCurrency.toLocaleString()} ${tree.currencies.find(x => x.id === offer.currencyTypeId)?.name ?? 'currency'}`);

    return parts.join(' + ') || 'free';
};

/** A page's offers, oldest first, each opening its editor in place; and a new one. */
const Offers = ({ tree, pageId, layout, offers, canManage }: { tree: CatalogTree; pageId: number; layout: string; offers: CatalogOffer[]; canManage: boolean }) => {
    const [ open, setOpen ] = useState<number | 'new' | null>(null);
    const note = PAGE_NOTES[layout]?.(tree);

    return (
        <Panel
            title={`Offers (${offers.length})`}
            description={note}
            actions={canManage && open !== 'new' ? <Button variant="secondary" icon={<Plus />} onClick={() => setOpen('new')} className="h-8 sm:h-8">New offer</Button> : undefined}
            className="overflow-clip"
        >
            {open === 'new' && <OfferEditor key="new" tree={tree} pageId={pageId} offer={null} canManage={canManage} start={startOf(layout)} onDone={() => setOpen(null)} />}
            {offers.length === 0 && open !== 'new'
                ? <EmptyState>No offers on this page.</EmptyState>
                : (
                        <ul className="divide-y divide-line">
                            {offers.map(offer => (
                                <li key={offer.id}>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(open === offer.id ? null : offer.id)}
                                        aria-expanded={open === offer.id}
                                        className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle/60"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className={cx('block truncate font-mono text-sm', !offer.visible && 'text-muted')}>{givesOf(offer)}</span>
                                            <span className="block truncate text-xs text-muted">
                                                #{offer.id}
                                                {offer.localizationId && offer.localizationId !== offer.products[0]?.definitionName ? ` · ${offer.localizationId}` : ''}
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                            {!offer.visible && <Badge><EyeOff className="size-3" />hidden</Badge>}
                                            {offer.isClubGift && <Badge tone="accent">gift{offer.clubGiftDaysRequired ? ` · ${offer.clubGiftDaysRequired}d` : ''}</Badge>}
                                            {offer.products.some(x => x.subscriptionType) && <Badge tone="green">membership</Badge>}
                                            {offer.clubLevel > 0 && <Badge tone="accent">{CLUB[offer.clubLevel] ?? 'club'}</Badge>}
                                            {offer.products.map(x => x.limited && <Badge key={x.id} tone="amber">limited {x.limited.remaining}/{x.limited.total}</Badge>)}
                                            <span className="font-mono text-xs whitespace-nowrap max-sm:hidden">{priceOf(offer, tree)}</span>
                                        </span>
                                        <ChevronDown className={cx('size-4 shrink-0 text-muted transition-transform', open === offer.id && 'rotate-180')} />
                                    </button>
                                    {open === offer.id && <OfferEditor key={offer.id} tree={tree} pageId={pageId} offer={offer} canManage={canManage} onDone={() => setOpen(null)} />}
                                </li>
                            ))}
                        </ul>
                    )}
        </Panel>
    );
};

/**
 * What is missing for players to reach the club shop: memberships on offer with no shown page of
 * the club window's layout, or club gifts with no shown page that lists them; and adding one.
 */
const ClubShopNotices = ({ tree, busy, onAdd }: { tree: CatalogTree; busy: boolean; onAdd: (title: string, name: string, layout: string) => void }) => {
    const club = tree.club!;

    return (
        <>
            {club.memberships > 0 && club.clubBuyPageId === null && (
                <WarningNotice>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span>{club.memberships} {club.memberships === 1 ? 'membership is' : 'memberships are'} on offer, but no shown page uses the club_buy layout, so players can't open the club window.</span>
                        {tree.canManage && <Button variant="secondary" disabled={busy} onClick={() => onAdd('Habbo Club', 'habbo_club', CLUB_BUY)} className="h-8 sm:h-8">Add a Habbo Club page</Button>}
                    </span>
                </WarningNotice>
            )}
            {club.gifts > 0 && club.clubGiftsPageId === null && (
                <WarningNotice>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span>{club.gifts} club {club.gifts === 1 ? 'gift is' : 'gifts are'} on offer, but no shown page uses the club_gifts layout to list them.</span>
                        {tree.canManage && <Button variant="secondary" disabled={busy} onClick={() => onAdd('Club Gifts', 'club_gifts', CLUB_GIFTS)} className="h-8 sm:h-8">Add a club gifts page</Button>}
                    </span>
                </WarningNotice>
            )}
        </>
    );
};

/**
 * The catalog editor: the page tree, and the page picked in it with its offers and its settings.
 * Edits are saved as they are made and go in front of players when published, which reloads the
 * catalog and tells everyone online to refresh it. Which catalog and page are open live in the
 * address, so a page can be linked to.
 */
export const CatalogPage = () => {
    const [ params, setParams ] = useSearchParams();
    const kind: CatalogKind = params.get('type') === 'builders' ? 'builders' : 'normal';
    const selected = Number(params.get('page')) || null;
    const tree = useCatalogTree(kind);
    const page = useCatalogPage(selected);
    const publish = useCatalogEdit(catalogCalls.publish);
    const addPage = useCatalogEdit(catalogCalls.createPage);
    const data = tree.data;

    const openPage = (id: number | null) => {
        const next = new URLSearchParams();

        if (kind === 'builders')
            next.set('type', 'builders');

        if (id && id !== data?.rootId)
            next.set('page', String(id));

        setParams(next);
        publish.reset();
    };

    const unpublished = data?.unpublishedChanges ?? 0;
    const path = data && selected ? ancestorsOf(data, selected).map(x => x.localization).reverse() : [];

    return (
        <>
            <PageHeader
                title="Catalog"
                description={data ? `${data.pages.length.toLocaleString()} pages${unpublished > 0 ? ` · ${unpublished} ${unpublished === 1 ? 'change' : 'changes'} not published` : ''}` : 'Pages, offers and prices'}
                tabs={{ items: KINDS, value: kind }}
            >
                {data?.canManage && (
                    <Button
                        icon={<Send />}
                        variant={unpublished > 0 ? 'primary' : 'secondary'}
                        disabled={publish.isPending}
                        onClick={() => window.confirm('Publish the catalog? Everyone online gets the new catalog at once.') && publish.mutate([])}
                    >
                        Publish{unpublished > 0 ? ` (${unpublished})` : ''}
                    </Button>
                )}
            </PageHeader>
            <PageBody className="flex flex-col gap-4">
                {tree.error && <ErrorNotice error={tree.error} />}
                {publish.error && <ErrorNotice error={publish.error} />}
                {publish.data && (
                    <SuccessNotice>
                        Published {publish.data.offers.toLocaleString()} offers on {publish.data.pages.toLocaleString()} pages; {publish.data.playersTold} {publish.data.playersTold === 1 ? 'player was' : 'players were'} told to refresh.
                    </SuccessNotice>
                )}
                {tree.isPending && <Loading />}
                {data?.club && (
                    <ClubShopNotices
                        tree={data}
                        busy={addPage.isPending}
                        onAdd={(title, name, layout) => addPage.mutate(
                            [ { parentId: data.rootId, localization: title, name, icon: 0, layout, imageData: [], textData: [], visible: true } ],
                            { onSuccess: saved => openPage(saved.id) },
                        )}
                    />
                )}
                {addPage.error && <ErrorNotice error={addPage.error} />}
                {data && (
                    data.rootId === 0
                        ? <EmptyState>This catalog has no pages.</EmptyState>
                        : (
                                <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-5">
                                    <Panel title="Pages" className={cx('lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto', selected !== null && 'max-lg:hidden')}>
                                        <div className="p-2">
                                            <PageTree key={kind} tree={data} selected={selected} onSelect={openPage} />
                                        </div>
                                    </Panel>

                                    {selected === null
                                        ? <p className="px-1 py-6 text-sm text-muted max-lg:hidden">Pick a page to see its offers and settings.</p>
                                        : (
                                                <div className="flex min-w-0 flex-col gap-4">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <Button variant="ghost" icon={<ArrowLeft />} onClick={() => openPage(null)} className="lg:hidden">Pages</Button>
                                                        {page.data && <PageIcon tree={data} icon={page.data.icon} />}
                                                        <div className="min-w-0">
                                                            <div className="truncate text-xs text-muted">{path.join(' / ') || 'Top level'}</div>
                                                            <div className="truncate font-semibold">{page.data?.localization ?? '…'}</div>
                                                        </div>
                                                        {page.data && !page.data.visible && <Badge className="ml-auto">hidden</Badge>}
                                                    </div>
                                                    {page.error && <ErrorNotice error={page.error} />}
                                                    {page.isPending && <Loading />}
                                                    {page.data && (
                                                        <>
                                                            <Offers key={page.data.id} tree={data} pageId={page.data.id} layout={page.data.layout} offers={page.data.offers} canManage={data.canManage} />
                                                            <Panel title="Page settings">
                                                                <PageSettings key={`${page.data.id}:${page.dataUpdatedAt}`} tree={data} page={page.data} canManage={data.canManage} onOpen={openPage} />
                                                            </Panel>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                </div>
                            )
                )}
            </PageBody>
        </>
    );
};
