import type { ReactNode } from 'react';

import type { BundleKind } from '#/api/bundles';

/** Something Habbo has that the hotel may take in: its count waiting, and its list to review and take in. */
export interface Category {
    id: string;
    label: string;
    group: CategoryGroup;
    /** What waits to be taken in; null while it is worked out or can't be. */
    count: number | null;
    /** Why there is no count, when it isn't only loading. */
    note?: string;
    content: ReactNode;
}

/** The headings the Waiting tab lists its categories under, in the order shown. */
export const CATEGORY_GROUPS = [ 'Gamedata', 'Bundles', 'Images', 'Misc' ] as const;

export type CategoryGroup = typeof CATEGORY_GROUPS[number];

/** The kinds of library a sync takes from Habbo, each with its category on the Waiting tab and the heading it is under. */
export const LIBRARY_CATEGORIES: { kind: BundleKind; id: string; label: string; group: CategoryGroup }[] = [
    { kind: 'furniture', id: 'furniture-bundles', label: 'Furniture', group: 'Bundles' },
    { kind: 'figure', id: 'figure-bundles', label: 'Figures', group: 'Bundles' },
    { kind: 'effect', id: 'effect-bundles', label: 'Effects', group: 'Bundles' },
    { kind: 'pet', id: 'pet-bundles', label: 'Pets', group: 'Bundles' },
    { kind: 'badge', id: 'badges', label: 'Badges', group: 'Images' },
    { kind: 'catalog-icon', id: 'catalog-icons', label: 'Catalog icons', group: 'Images' },
    { kind: 'catalog-image', id: 'catalog-pictures', label: 'Catalog pictures', group: 'Images' },
    { kind: 'sound', id: 'trax-samples', label: 'Trax samples', group: 'Misc' },
    { kind: 'room', id: 'room-bundles', label: 'Room libraries', group: 'Misc' },
];

/** The Waiting tab, opened on one category. */
export const waitingLink = (id: string) => `/gamedata/updates/waiting?pick=${id}`;
