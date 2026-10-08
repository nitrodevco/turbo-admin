import type { BuilderKind } from '#/api/catalog';

/** What a builder needs told before it can plan. */
export type BuilderInput = 'none' | 'base' | 'line' | 'petType';

export interface BuilderSpec {
    kind: BuilderKind;
    title: string;
    blurb: string;
    /** The layouts it builds for, the first being the one it sets. */
    layouts: string[];
    input: BuilderInput;
}

/**
 * The page builders, each making what a layout needs the way the client reads it, from the
 * hotel's own furniture, pets and effects. Each plans first; what it plans is picked from and then
 * made, through the same checks as any edit.
 */
export const BUILDERS: BuilderSpec[] = [
    {
        kind: 'trophies',
        title: 'Trophies',
        blurb: 'Every trophy furni. A family\'s gold, silver and bronze (name*1, *2, *3) become one trophy with three colours, named _g, _s and _b as the trophy page groups them.',
        layouts: [ 'trophies' ],
        input: 'none',
    },
    {
        kind: 'pets',
        title: 'Pet shop',
        blurb: 'A page per pet type that has breeds for sale, under this one: the pet page sells only its first offer, and reads the type from its name key (a0 pet<type>).',
        layouts: [ 'pets' ],
        input: 'none',
    },
    {
        kind: 'colours',
        title: 'Colour family',
        blurb: 'One offer per colour of a furni (chair_plasty*1, *2…), in order, so the colour-grouped grid shows one tile with swatches.',
        layouts: [ 'default_3x3_color_grouping', 'default_3x3' ],
        input: 'base',
    },
    {
        kind: 'furniLine',
        title: 'Furni line',
        blurb: 'Everything in a furni line, or every class name starting with a prefix: a page of a set, in one go.',
        layouts: [ 'default_3x3', 'default_3x3_color_grouping' ],
        input: 'line',
    },
    {
        kind: 'petCustomization',
        title: 'Pet accessories',
        blurb: 'Shampoos, dyes, hair parts and saddles, for one pet type or all: the pet accessories page tries each on its pet.',
        layouts: [ 'petcustomization' ],
        input: 'petType',
    },
    {
        kind: 'effects',
        title: 'Effects',
        blurb: 'Every avatar effect the hotel has a name for, but those it never gives.',
        layouts: [ 'pixeleffects' ],
        input: 'none',
    },
    {
        kind: 'spaces',
        title: 'Spaces',
        blurb: 'Every floor, wallpaper and landscape pattern product data names (floor_single_101…), each a pattern of the one floor, wallpaper or landscape item, for the spaces page and its room preview.',
        layouts: [ 'spaces_new' ],
        input: 'none',
    },
    {
        kind: 'posters',
        title: 'Posters',
        blurb: 'Every poster product data names (poster 1, poster 2…), each the poster item carrying its number.',
        layouts: [ 'default_3x3' ],
        input: 'none',
    },
    {
        kind: 'badgeDisplays',
        title: 'Badge displays',
        blurb: 'The badge display furni. The buyer picks one of their own badges to put in it.',
        layouts: [ 'badge_display' ],
        input: 'none',
    },
    {
        kind: 'songDiscs',
        title: 'Song discs',
        blurb: 'A song disc for every official song (Catalog → Songs), each the song_disk furni carrying its song, previewed with its length.',
        layouts: [ 'soundmachine' ],
        input: 'none',
    },
    {
        kind: 'soldLimited',
        title: 'Sold-out limited',
        blurb: 'Gathers the limited offers that sold out onto this page, where the client shows them as gone.',
        layouts: [ 'sold_ltd_items' ],
        input: 'none',
    },
];

/** The builders for a layout, those made for it first. */
export const buildersFor = (layout: string) => [
    ...BUILDERS.filter(x => x.layouts.includes(layout)),
    ...BUILDERS.filter(x => !x.layouts.includes(layout)),
];
