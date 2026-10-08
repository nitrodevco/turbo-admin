import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post, put, remove } from './client';

/**
 * Which catalogs show a page. Both catalogs are cut from the one tree: a page shown in one brings
 * the pages above it along, so the client can reach it. `invisible` stays in the normal catalog,
 * hidden, for links that open it by name.
 */
export type PageDisplay = 'regular' | 'bc_only' | 'both' | 'invisible';

export interface CatalogPageNode {
    id: number;
    parentId: number | null;
    localization: string;
    name: string | null;
    icon: number;
    display: PageDisplay;
    sortOrder: number;
    offerCount: number;
}

export interface CatalogCurrency {
    id: number;
    name: string;
    activityPointType: number;
}

/** The club shop: what the club window sells, and the shown pages that open it. */
export interface CatalogClubSummary {
    memberships: number;
    gifts: number;
    clubBuyPageId: number | null;
    clubGiftsPageId: number | null;
}

export interface CatalogTree {
    rootId: number;
    pages: CatalogPageNode[];
    canManage: boolean;
    unpublishedChanges: number;
    currencies: CatalogCurrency[];
    layouts: string[];
    club: CatalogClubSummary;
}

export type Membership = 'HabboClub' | 'BuildersClub';

/** The layout whose page is the club window, listing every shown membership. */
export const CLUB_BUY = 'club_buy';

/** The layout whose page lists the club gifts. */
export const CLUB_GIFTS = 'club_gifts';

/** The name the client opens the club shop by, from the toolbar, the club centre and elsewhere. */
export const CLUB_PAGE_NAME = 'hc_membership';

/** The name the client opens the club gifts by. */
export const CLUB_GIFTS_PAGE_NAME = 'club_gifts';

export interface CatalogLimited {
    id: number;
    total: number;
    remaining: number;
    raffleWindowSeconds: number;
    startsAtUtc: string | null;
    endsAtUtc: string | null;
    active: boolean;
    raffleFinished: boolean;
}

export interface CatalogLimitedInput {
    totalQuantity: number;
    raffleWindowSeconds: number;
    startsAtUtc: string | null;
    endsAtUtc: string | null;
    active: boolean;
}

export type ProductKind = 'floor' | 'wall' | 'badge' | 'effect' | 'robot' | 'pet' | 'club';

export interface CatalogProduct {
    id: number;
    type: ProductKind;
    definitionId: number | null;
    definitionName: string | null;
    spriteId: number | null;
    extraParam: string | null;
    quantity: number;
    limited: CatalogLimited | null;
    subscriptionType: Membership | null;
    subscriptionDays: number;
}

export interface CatalogOffer {
    id: number;
    localizationId: string;
    costCredits: number;
    costCurrency: number;
    currencyTypeId: number | null;
    canGift: boolean;
    canBundle: boolean;
    clubLevel: number;
    visible: boolean;
    isClubGift: boolean;
    clubGiftDaysRequired: number | null;
    products: CatalogProduct[];
}

export interface CatalogPageDetail {
    id: number;
    parentId: number | null;
    localization: string;
    name: string | null;
    icon: number;
    layout: string;
    imageData: string[];
    textData: string[];
    display: PageDisplay;
    offers: CatalogOffer[];
}

export interface CatalogFurniture {
    id: number;
    name: string;
    spriteId: number;
    type: 'floor' | 'wall';
}

export interface CatalogPageInput {
    parentId?: number;
    localization: string;
    name: string | null;
    icon: number;
    layout: string;
    imageData: string[];
    textData: string[];
    display: PageDisplay;
}

export interface CatalogOfferInput {
    pageId: number;
    localizationId: string;
    costCredits: number;
    costCurrency: number;
    currencyTypeId: number | null;
    canGift: boolean;
    canBundle: boolean;
    clubLevel: number;
    visible: boolean;
    /** Null leaves what an existing offer gives as it is; `products` replaces it when given. */
    product: CatalogProductInput | null;
    /** Everything the offer gives, in order: replaces what it gave. */
    products?: CatalogProductInput[];
    /** Set: a club gift, claimed by members with this many days of club used up. */
    clubGiftDaysRequired: number | null;
}

export type EditableKind = 'floor' | 'wall' | 'badge' | 'effect' | 'robot' | 'pet' | 'club';

export interface CatalogProductInput {
    type: EditableKind;
    definitionId: number | null;
    extraParam: string | null;
    quantity: number;
    subscription: Membership | null;
    subscriptionDays: number;
}

interface Saved {
    id: number;
    unpublishedChanges: number;
}

/** Where a featured item takes the player: a page by its link key, an offer, or a product code. */
export type FeaturedLinkType = 'page' | 'offer' | 'product';

export interface CatalogFeaturedItem {
    id: number;
    position: number;
    title: string;
    image: string;
    type: FeaturedLinkType;
    value: string;
    expiresAtUtc: string | null;
}

export interface CatalogFeaturedInput {
    title: string;
    image: string;
    type: FeaturedLinkType;
    value: string;
    expiresAtUtc: string | null;
}

/** The client shows four: the first big, the others in a list beside it. */
export const FEATURED_MAX = 4;

export interface PublishResult {
    pages: number;
    offers: number;
    playersTold: number;
}

export const useCatalogTree = () => useQuery({
    queryKey: [ 'catalog', 'tree' ],
    queryFn: () => api<CatalogTree>('/catalog'),
});

export const useCatalogPage = (id: number | null) => useQuery({
    queryKey: [ 'catalog', 'page', id ],
    queryFn: () => api<CatalogPageDetail>(`/catalog/pages/${id}`),
    enabled: id !== null,
});

export const useFurnitureSearch = (text: string) => useQuery({
    queryKey: [ 'catalog', 'furniture', text ],
    queryFn: () => api<CatalogFurniture[]>(`/catalog/furniture?${new URLSearchParams({ q: text })}`),
    enabled: text.trim().length > 0,
    staleTime: 5 * 60_000,
});

/** The page builders: each makes a layout's offers (or pages) from the hotel's own data. */
export type BuilderKind = 'trophies' | 'pets' | 'colours' | 'furniLine' | 'petCustomization' | 'effects' | 'soldLimited' | 'spaces' | 'posters' | 'badgeDisplays' | 'songDiscs';

export interface BuildRequest {
    builder: BuilderKind;
    base: string | null;
    line: string | null;
    prefix: string | null;
    petType: number | null;
}

export interface BuildProduct {
    type: ProductKind;
    definitionId: number | null;
    definitionName: string | null;
    extraParam: string | null;
    quantity: number;
}

export interface BuildItem {
    key: string;
    title: string;
    localizationId: string;
    products: BuildProduct[];
    pageTitle: string | null;
    offerId: number | null;
    alreadyOffered: boolean;
    note: string | null;
}

export interface BuildPlan {
    builder: BuilderKind;
    layout: string;
    createsPages: boolean;
    items: BuildItem[];
    warnings: string[];
}

export interface BuildApply extends BuildRequest {
    keys: string[];
    costCredits: number;
    costCurrency: number;
    currencyTypeId: number | null;
    clubLevel: number;
    canGift: boolean;
    visible: boolean;
    setLayout: boolean;
    display: PageDisplay | null;
}

export interface BuildResult {
    offersCreated: number;
    pagesCreated: number;
    offersMoved: number;
    unpublishedChanges: number;
    failures: { key: string; error: string }[];
}

export const useFurniLines = (enabled: boolean) => useQuery({
    queryKey: [ 'catalog', 'furni-lines' ],
    queryFn: () => api<{ lines: { line: string; count: number }[] }>('/catalog/builders/furni-lines'),
    enabled,
    staleTime: 10 * 60_000,
});

export const useCatalogFeatured = () => useQuery({
    queryKey: [ 'catalog', 'featured' ],
    queryFn: () => api<{ items: CatalogFeaturedItem[] }>('/catalog/featured'),
});

export const catalogCalls = {
    createPage: (input: CatalogPageInput) => post<Saved>('/catalog/pages', input),
    updatePage: (id: number, input: CatalogPageInput) => put<Saved>(`/catalog/pages/${id}`, input),
    movePage: (id: number, parentId: number, index: number) => post<Saved>(`/catalog/pages/${id}/move`, { parentId, index }),
    deletePage: (id: number) => remove<Saved>(`/catalog/pages/${id}`),
    createOffer: (input: CatalogOfferInput) => post<Saved>('/catalog/offers', input),
    updateOffer: (id: number, input: CatalogOfferInput) => put<Saved>(`/catalog/offers/${id}`, input),
    moveOffer: (id: number, pageId: number, index: number) => post<Saved>(`/catalog/offers/${id}/move`, { pageId, index }),
    deleteOffer: (id: number) => remove<Saved>(`/catalog/offers/${id}`),
    saveFeatured: (items: CatalogFeaturedInput[]) => put<Saved>('/catalog/featured', { items }),
    saveLimited: (offerId: number, input: CatalogLimitedInput) => put<Saved>(`/catalog/offers/${offerId}/limited`, input),
    removeLimited: (offerId: number) => remove<Saved>(`/catalog/offers/${offerId}/limited`),
    publish: () => post<PublishResult>('/catalog/publish'),
    previewBuild: (pageId: number, request: BuildRequest) => post<BuildPlan>(`/catalog/pages/${pageId}/build/preview`, request),
    applyBuild: (pageId: number, request: BuildApply) => post<BuildResult>(`/catalog/pages/${pageId}/build`, request),
};

/** A catalog edit; the tree and pages are read again once it lands, saved or not. */
export const useCatalogEdit = <A extends unknown[], R>(call: (...args: A) => Promise<R>) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: A) => call(...args),
        onSettled: () => void queryClient.invalidateQueries({ queryKey: [ 'catalog' ] }),
    });
};
