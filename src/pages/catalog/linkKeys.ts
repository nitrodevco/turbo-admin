/**
 * The page names the client opens pages by, from Flash's `CatalogPageName`, and where it opens
 * each. A page gets one of these as its name to be the page those buttons open; any other name
 * works too, for links of the hotel's own.
 */
export const LINK_KEYS: { key: string; note: string }[] = [
    { key: 'hc_membership', note: 'The club shop: the toolbar, the club centre, quests and featured items open it, and buying a membership is bought from it. Give it the club_buy layout.' },
    { key: 'club_gifts', note: 'The club gifts: the club centre and the gift notice open it. Give it the club_gifts layout.' },
    { key: 'credits', note: 'Buying credits: the me menu and credit links open it.' },
    { key: 'ducket_info', note: 'About duckets: the purse opens it.' },
    { key: 'loyalty_info', note: 'About loyalty points: the purse opens it.' },
    { key: 'avatar_effects', note: 'Effects: the me menu\'s effects open it.' },
    { key: 'new_additions', note: 'New furniture: opened when the catalogue first opens, while that is on.' },
    { key: 'limited_sold', note: 'Sold-out limited items; a page whose name contains it shows the sold limited items.' },
    { key: 'pet_accessories', note: 'Pet accessories: a pet\'s infostand opens it.' },
    { key: 'trax_songs', note: 'Trax songs: the jukebox playlist editor opens it.' },
    { key: 'guild_custom_furni', note: 'Group furniture: a group\'s details open it.' },
    { key: 'gift_shop', note: 'The gift shop: an opened present offers it.' },
    { key: 'room_bundles', note: 'Room bundles: featured items open it.' },
    { key: 'room_bundles_mobile', note: 'Room bundles on mobile; featured items open room_bundles for it.' },
    { key: 'mobile_subscriptions', note: 'Mobile subscriptions; featured items open hc_membership for it.' },
    { key: 'habbo_club_desktop', note: 'Habbo Club on desktop.' },
    { key: 'horse_styles', note: 'Horse styles.' },
    { key: 'horse_shoe', note: 'Horseshoes.' },
    { key: 'ecotron_transform', note: 'The ecotron.' },
    { key: 'quest_shell', note: 'A quest shop.' },
    { key: 'quest_snowflakes', note: 'A quest shop.' },
    { key: 'val_quests', note: 'Valentine quests.' },
    { key: 'set_easter', note: 'The Easter set.' },
];

/** What the client does with a page of this name; undefined for a name of the hotel's own. */
export const linkKeyNote = (name: string | null) => LINK_KEYS.find(x => x.key === name)?.note;
