import type { CatalogOffer, CatalogTree } from '#/api/catalog';

import { lengthOf } from './labels';

/** What an offer gives, in a few words: the item, the badge, the membership, or what else it is. */
export const givesOf = (offer: Pick<CatalogOffer, 'products'>) =>
    offer.products.map((x) => {
        if (x.subscriptionType)
            return `${x.subscriptionType === 'BuildersClub' ? 'Builders Club' : 'Habbo Club'}, ${lengthOf(x.subscriptionDays)}`;

        if (x.type === 'effect')
            return `effect ${x.extraParam ?? '?'}`;

        if (x.type === 'pet')
            return x.definitionName ?? `pet ${x.extraParam ?? '?'}`;

        if (x.type === 'robot')
            return x.definitionName ?? 'bot';

        return `${x.quantity > 1 ? `${x.quantity} × ` : ''}${x.definitionName ?? x.extraParam ?? x.type}`;
    }).join(' + ') || 'nothing';

/** An offer's price as the client puts it: credits, a currency, both, or free. */
export const priceOf = (offer: Pick<CatalogOffer, 'costCredits' | 'costCurrency' | 'currencyTypeId'>, tree: CatalogTree) => {
    const parts = [];

    if (offer.costCredits > 0)
        parts.push(`${offer.costCredits.toLocaleString()} c`);

    if (offer.costCurrency > 0)
        parts.push(`${offer.costCurrency.toLocaleString()} ${tree.currencies.find(x => x.id === offer.currencyTypeId)?.name ?? 'pts'}`);

    return parts.join(' + ') || 'free';
};

/** The id an offer's tile has among the editor's draggables. */
export const offerDragId = (id: number) => `offer:${id}`;

/**
 * The offer editor's key: what the offer is, so the editor starts again from the saved offer once
 * a save is read back, and not when the catalog is merely read again.
 */
export const offerKey = (offer: CatalogOffer | null) => (offer ? JSON.stringify(offer) : 'new');
