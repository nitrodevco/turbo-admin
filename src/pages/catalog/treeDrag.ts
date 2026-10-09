import type { CatalogPageNode, CatalogTree } from '#/api/catalog';

import { childrenOf } from './tree';

/** One row of the tree as it is drawn: a page, how deep it is, and under which page. */
export interface FlatRow {
    page: CatalogPageNode;
    parentId: number;
    depth: number;
    hasChildren: boolean;
}

/** The id a page's row has among the editor's draggables. */
export const pageDragId = (id: number) => `page:${id}`;

/** How far a level is indented, which is also how far a drag must go sideways to change level. */
export const INDENT = 16;

/** The rows the tree draws: the root's children, and the children of every open page under them. */
export const flatten = (tree: CatalogTree, open: Set<number>, skipUnder?: number): FlatRow[] => {
    const children = childrenOf(tree);
    const rows: FlatRow[] = [];

    const walk = (parentId: number, depth: number) => {
        for (const page of children.get(parentId) ?? []) {
            const kids = children.get(page.id) ?? [];

            rows.push({ page, parentId, depth, hasChildren: kids.length > 0 });

            if (open.has(page.id) && page.id !== skipUnder)
                walk(page.id, depth + 1);
        }
    };

    walk(tree.rootId, 0);

    return rows;
};

/** Where a dragged page would go: under which page, and its place among that page's children. */
export interface Projection {
    depth: number;
    parentId: number;
    index: number;
}

/**
 * Where a page dragged over a row lands, as dnd-kit's sortable tree works it out: it takes the row's
 * place, and its depth follows how far the pointer went sideways, kept between being the row above's
 * child and being a sibling of the row below.
 */
export const project = (rows: FlatRow[], activeId: number, overId: number, offsetX: number, rootId: number): Projection | null => {
    const from = rows.findIndex(x => x.page.id === activeId);
    const to = rows.findIndex(x => x.page.id === overId);

    if (from < 0 || to < 0)
        return null;

    const moved = [ ...rows ];
    const [ active ] = moved.splice(from, 1);

    moved.splice(to, 0, active!);

    const previous = moved[to - 1];
    const next = moved[to + 1];
    const wanted = active!.depth + Math.round(offsetX / INDENT);
    const maxDepth = previous ? previous.depth + 1 : 0;
    const minDepth = next ? next.depth : 0;
    const depth = Math.min(Math.max(wanted, minDepth), maxDepth);

    // The nearest row above at one level up is the parent; none is the root.
    let parentId = rootId;

    if (depth > 0 && previous) {
        if (depth === previous.depth)
            parentId = previous.parentId;
        else if (depth > previous.depth)
            parentId = previous.page.id;
        else
            parentId = moved.slice(0, to).reverse().find(x => x.depth === depth)?.parentId ?? rootId;
    }

    // Its place among its new siblings: those of them above it.
    const index = moved.slice(0, to).filter(x => x.parentId === parentId && x.depth === depth).length;

    return { depth, parentId, index };
};

/**
 * The tree as it is once a page has moved: what the server will make of it, so the tree can show it
 * before the server answers. Its new siblings are numbered again around it.
 */
export const movePageIn = (tree: CatalogTree, id: number, parentId: number, index: number): CatalogTree => {
    const page = tree.pages.find(x => x.id === id);

    if (!page)
        return tree;

    const siblings = (childrenOf(tree).get(parentId) ?? []).filter(x => x.id !== id);
    const at = Math.max(0, Math.min(index, siblings.length));

    siblings.splice(at, 0, { ...page, parentId });

    const order = new Map(siblings.map((x, i) => [ x.id, i ]));

    return {
        ...tree,
        pages: tree.pages.map(x => (x.id === id ? { ...x, parentId, sortOrder: order.get(id)! } : order.has(x.id) ? { ...x, sortOrder: order.get(x.id)! } : x)),
    };
};
