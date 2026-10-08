import type { CatalogOffer } from '#/api/catalog';

import { type LayoutSpec, showsOffers } from './layouts';

export interface LayoutIssue {
    tone: 'warn' | 'info';
    text: string;
    /** The offers it is about, to mark. */
    offers?: number[];
}

/** The class name of what an offer gives, when it is one item. */
const classOf = (offer: CatalogOffer) => (offer.products.length === 1 ? offer.products[0]!.definitionName ?? '' : '');

const TROPHY_TYPE = /_([gsb])$/;

/** The three items the spaces page sells, each a pattern of one item. */
const SPACES = new Set([ 'floor', 'wallpaper', 'landscape' ]);

/** Items that are nothing without the pattern, number or song their product carries. */
const NEEDS_PARAM = new Set([ 'floor', 'wallpaper', 'landscape', 'poster', 'song_disk' ]);

/**
 * What would go wrong with a page as the client reads it: offers it never shows, names it groups
 * by that don't follow its rule, or offers the hotel can't yet complete the purchase of. Read
 * from Flash's catalogue widgets, which nitro-next mirrors.
 */
export const checkLayout = (spec: LayoutSpec, offers: CatalogOffer[]): LayoutIssue[] => {
    const issues: LayoutIssue[] = [];
    const shown = offers.filter(x => x.visible);
    const ids = (list: CatalogOffer[]) => list.map(x => x.id);

    if (!showsOffers(spec) && spec.kind !== 'club' && spec.kind !== 'gifts' && offers.length > 0 && spec.code !== 'roomads' && !spec.code.startsWith('builders_club'))
        issues.push({ tone: 'info', text: `This layout never shows its own offers, so the ${offers.length} here aren't seen on it. They're still bought from elsewhere (search, links, furni).`, offers: ids(offers) });

    switch (spec.code) {
        case 'trophies': {
            const loose = shown.filter(x => /\*[123]$/.test(classOf(x)) && !TROPHY_TYPE.test(x.localizationId));

            if (loose.length > 0)
                issues.push({ tone: 'warn', text: `${loose.length} trophy colour${loose.length === 1 ? '' : 's'} won't group: the trophy page pairs gold, silver and bronze by name keys ending _g, _s and _b. The Trophies builder names them so.`, offers: ids(loose) });

            break;
        }
        case 'pets': {
            const first = shown[0];
            const type = first ? /(\d+)$/.exec(first.localizationId)?.[1] : undefined;

            if (!first)
                issues.push({ tone: 'warn', text: 'A pet page sells its first offer: give it a pet offer, or use the Pet shop builder to make a page per pet.' });
            else if (!first.products.some(x => x.type === 'pet'))
                issues.push({ tone: 'warn', text: 'The first offer isn\'t a pet, and it\'s the only one the pet page shows.', offers: [ first.id ] });
            else if (type === undefined || /^\d+$/.test(first.localizationId))
                issues.push({ tone: 'warn', text: 'The pet page reads the pet type from the end of the first offer\'s name key: name it a0 pet<type>.', offers: [ first.id ] });

            if (shown.length > 1)
                issues.push({ tone: 'info', text: `Only the first offer is shown; the other ${shown.length - 1} aren't. One page per pet.`, offers: ids(shown.slice(1)) });

            break;
        }
        case 'single_bundle':
            if (shown.length !== 1)
                issues.push({ tone: 'warn', text: shown.length === 0 ? 'A bundle page needs one offer holding the whole bundle.' : `A bundle page opens only with exactly one offer; this has ${shown.length}. Put everything in one offer.`, offers: ids(shown) });

            break;
        case 'default_3x3_color_grouping': {
            const plain = shown.filter(x => classOf(x) && !classOf(x).includes('*'));

            if (plain.length > 0)
                issues.push({ tone: 'info', text: `${plain.length} offer${plain.length === 1 ? ' has' : 's have'} no colours (no * in the class name), so ${plain.length === 1 ? 'it gets' : 'they get'} a tile of ${plain.length === 1 ? 'its' : 'their'} own.`, offers: ids(plain) });

            break;
        }
        case 'sold_ltd_items': {
            const notSold = offers.filter(x => !x.products.some(p => p.limited && p.limited.remaining === 0));

            if (notSold.length > 0)
                issues.push({ tone: 'warn', text: `${notSold.length} offer${notSold.length === 1 ? ' isn\'t a' : 's aren\'t'} sold-out limited item${notSold.length === 1 ? '' : 's'}; this page shows everything as not available.`, offers: ids(notSold) });

            break;
        }
        case 'pixeleffects': {
            const other = shown.filter(x => !x.products.some(p => p.type === 'effect'));

            if (other.length > 0)
                issues.push({ tone: 'info', text: `${other.length} offer${other.length === 1 ? ' gives' : 's give'} no effect; the effects page previews effects on the avatar.`, offers: ids(other) });

            break;
        }
        case 'bots': {
            const other = shown.filter(x => !x.products.some(p => p.type === 'robot'));

            if (other.length > 0)
                issues.push({ tone: 'info', text: `${other.length} offer${other.length === 1 ? ' gives' : 's give'} no bot; the bot page draws each bot from its figure.`, offers: ids(other) });

            break;
        }
        case 'roomads':
            if (shown.length > 1 && !shown.some(x => x.clubLevel === 2))
                issues.push({ tone: 'info', text: 'With two offers the client sells the VIP one (club level 2) to extend an ad, and the other to start one. Neither is VIP.' });

            break;
        case 'spaces_new': {
            const kinds = new Set(shown.map(classOf).filter(x => SPACES.has(x)));

            if (shown.length > 0 && kinds.size < 3)
                issues.push({ tone: 'info', text: `The room preview needs a floor, a wallpaper and a landscape; this page has no ${[ 'floor', 'wallpaper', 'landscape' ].filter(x => !kinds.has(x)).join(' or ')}.` });

            const other = shown.filter(x => !SPACES.has(classOf(x)));

            if (other.length > 0)
                issues.push({ tone: 'info', text: `${other.length} offer${other.length === 1 ? ' isn\'t' : 's aren\'t'} a floor, wallpaper or landscape, so the spaces page leaves ${other.length === 1 ? 'it' : 'them'} out.`, offers: ids(other) });

            break;
        }
        case 'badge_display': {
            const other = shown.filter(x => !classOf(x).startsWith('badge_display'));

            if (other.length > 0)
                issues.push({ tone: 'info', text: `${other.length} offer${other.length === 1 ? ' isn\'t a badge display' : 's aren\'t badge displays'}; the page still asks the buyer for a badge.`, offers: ids(other) });

            break;
        }
        case 'guild_custom_furni':
        case 'guild_forum':
            issues.push({ tone: 'info', text: 'Group furni is only bought for a group when its definition\'s logic is guild_customized (or guild_forum). The hotel\'s group furni definitions mostly aren\'t, so they arrive as plain furni.' });
            break;
    }

    // A pattern, poster or song the product doesn't carry: the hotel refuses to sell it, as it would show nothing.
    const unsellable = offers.filter(x => x.products.some(p => NEEDS_PARAM.has(p.definitionName ?? '') && !p.extraParam?.trim()));

    if (unsellable.length > 0)
        issues.push({ tone: 'warn', text: `${unsellable.length} offer${unsellable.length === 1 ? ' gives' : 's give'} a floor, wallpaper, landscape, poster or song disc without its pattern, number or song, so the hotel won't sell ${unsellable.length === 1 ? 'it' : 'them'}. Set it on the product, or use the Spaces or Posters builder.`, offers: ids(unsellable) });

    const empty = showsOffers(spec) && offers.length === 0 && spec.code !== 'pets' && spec.code !== 'single_bundle';

    if (empty)
        issues.push({ tone: 'info', text: 'No offers yet. Add some, or use Build to fill it.' });

    return issues;
};
