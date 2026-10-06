import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post, put, remove } from './client';

export type CatalogKind = 'normal' | 'builders';

export interface CatalogPageNode {
    id: number;
    parentId: number | null;
    localization: string;
    name: string | null;
    icon: number;
    visible: boolean;
    sortOrder: number;
    offerCount: number;
}

export interface CatalogCurrency {
    id: number;
    name: string;
    activityPointType: number;
}

/** The normal catalog's club shop: what the club window sells, and the shown pages that open it. */
export interface CatalogClubSummary {
    memberships: number;
    gifts: number;
    clubBuyPageId: number | null;
    clubGiftsPageId: number | null;
}

export interface CatalogTree {
    catalogType: string;
    rootId: number;
    pages: CatalogPageNode[];
    canManage: boolean;
    unpublishedChanges: number;
    currencies: CatalogCurrency[];
    layouts: string[];
    /** Only for the normal catalog. */
    club: CatalogClubSummary | null;
}

export type Membership = 'HabboClub' | 'BuildersClub';

/** The layout whose page is the club window, listing every shown membership. */
export const CLUB_BUY = 'club_buy';

/** The layout whose page lists the club gifts. */
export const CLUB_GIFTS = 'club_gifts';

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
    catalogType: string;
    localization: string;
    name: string | null;
    icon: number;
    layout: string;
    imageData: string[];
    textData: string[];
    visible: boolean;
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
    visible: boolean;
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
    /** Null leaves what an existing offer gives as it is. */
    product: CatalogProductInput | null;
    /** Set: a club gift, claimed by members with this many days of club used up. */
    clubGiftDaysRequired: number | null;
}

export type EditableKind = 'floor' | 'wall' | 'badge' | 'club';

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

export interface PublishResult {
    pages: number;
    offers: number;
    playersTold: number;
}

export const useCatalogTree = (kind: CatalogKind) => useQuery({
    queryKey: [ 'catalog', 'tree', kind ],
    queryFn: () => api<CatalogTree>(`/catalog?type=${kind}`),
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

export const catalogCalls = {
    createPage: (input: CatalogPageInput) => post<Saved>('/catalog/pages', input),
    updatePage: (id: number, input: CatalogPageInput) => put<Saved>(`/catalog/pages/${id}`, input),
    movePage: (id: number, parentId: number, index: number) => post<Saved>(`/catalog/pages/${id}/move`, { parentId, index }),
    deletePage: (id: number) => remove<Saved>(`/catalog/pages/${id}`),
    createOffer: (input: CatalogOfferInput) => post<Saved>('/catalog/offers', input),
    updateOffer: (id: number, input: CatalogOfferInput) => put<Saved>(`/catalog/offers/${id}`, input),
    deleteOffer: (id: number) => remove<Saved>(`/catalog/offers/${id}`),
    saveLimited: (offerId: number, input: CatalogLimitedInput) => put<Saved>(`/catalog/offers/${offerId}/limited`, input),
    removeLimited: (offerId: number) => remove<Saved>(`/catalog/offers/${offerId}/limited`),
    publish: () => post<PublishResult>('/catalog/publish'),
};

/** A catalog edit; the tree and pages are read again once it lands, saved or not. */
export const useCatalogEdit = <A extends unknown[], R>(call: (...args: A) => Promise<R>) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: A) => call(...args),
        onSettled: () => void queryClient.invalidateQueries({ queryKey: [ 'catalog' ] }),
    });
};
