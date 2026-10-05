import type { CatalogPageNode, CatalogTree } from '#/api/catalog';

/** The children of every page, in the order the client shows them. */
export const childrenOf = (tree: CatalogTree) => {
    const map = new Map<number, CatalogPageNode[]>();

    for (const page of tree.pages) {
        const key = page.parentId ?? 0;

        map.set(key, [ ...(map.get(key) ?? []), page ]);
    }

    for (const list of map.values())
        list.sort((a, b) => a.sortOrder - b.sortOrder || a.localization.localeCompare(b.localization) || a.id - b.id);

    return map;
};

/** A page's ancestors, nearest first; the root is left out. */
export const ancestorsOf = (tree: CatalogTree, id: number) => {
    const byId = new Map(tree.pages.map(x => [ x.id, x ]));
    const path: CatalogPageNode[] = [];

    for (let at = byId.get(id)?.parentId; at !== null && at !== undefined && at !== tree.rootId; at = byId.get(at)?.parentId)
        if (byId.get(at)) path.push(byId.get(at)!);

    return path;
};
