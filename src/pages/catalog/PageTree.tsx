import { ChevronRight, EyeOff, Hammer, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { catalogIconUrl, useClientAssets } from '#/api/assets';
import { type CatalogPageNode, type CatalogTree } from '#/api/catalog';
import { Input } from '#/components/ui';
import { cx } from '#/lib/cx';

import { DISPLAY_LABELS, inBuildersClub } from './labels';
import { ancestorsOf, childrenOf } from './tree';

export const PageIcon = ({ icon, className }: { icon: number; className?: string }) => {
    const url = catalogIconUrl(useClientAssets(), icon);

    return (
        <span className={cx('grid size-5 shrink-0 place-items-center', className)}>
            {url && <img src={url} alt="" loading="lazy" className="max-h-5 max-w-5 [image-rendering:pixelated]" onError={event => (event.currentTarget.style.display = 'none')} />}
        </span>
    );
};

/**
 * The catalog's pages as the client's navigator shows them, the root's children at the top, marked
 * where they are hidden or shown in the Builders Club catalog. Each opens and closes; a search
 * shows every page whose title or name matches, with where it sits.
 */
export const PageTree = ({ tree, selected, onSelect }: { tree: CatalogTree; selected: number | null; onSelect: (id: number) => void }) => {
    const children = useMemo(() => childrenOf(tree), [ tree ]);
    const [ open, setOpen ] = useState<Set<number>>(() => new Set(selected ? ancestorsOf(tree, selected).map(x => x.id) : []));
    const [ filter, setFilter ] = useState('');
    const needle = filter.trim().toLowerCase();

    const toggle = (id: number) => setOpen((current) => {
        const next = new Set(current);

        if (!next.delete(id))
            next.add(id);

        return next;
    });

    const row = (page: CatalogPageNode, depth: number, path?: string) => {
        const kids = children.get(page.id) ?? [];
        const isOpen = open.has(page.id) || (selected !== null && ancestorsOf(tree, selected).some(x => x.id === page.id));

        return (
            <li key={page.id}>
                <div
                    className={cx(
                        'flex min-h-11 items-center gap-1.5 rounded-lg pr-2 text-sm sm:min-h-8',
                        selected === page.id ? 'bg-accent-soft text-accent' : 'hover:bg-subtle',
                    )}
                    style={{ paddingLeft: `${4 + depth * 14}px` }}
                >
                    <button
                        type="button"
                        aria-label={isOpen ? `Close ${page.localization}` : `Open ${page.localization}`}
                        onClick={() => toggle(page.id)}
                        className={cx('grid size-6 shrink-0 place-items-center rounded text-muted hover:text-ink', kids.length === 0 && 'invisible')}
                    >
                        <ChevronRight className={cx('size-3.5 transition-transform', isOpen && 'rotate-90')} />
                    </button>
                    <button type="button" onClick={() => onSelect(page.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <PageIcon icon={page.icon} />
                        <span className={cx('min-w-0 flex-1 truncate', (page.display === 'invisible' || page.display === 'bc_only') && 'text-muted')}>
                            {page.localization}
                            {path && <span className="ml-1.5 text-xs text-muted">{path}</span>}
                        </span>
                        {page.display === 'invisible' && <EyeOff className="size-3.5 shrink-0 text-muted" aria-label="hidden" />}
                        {inBuildersClub(page.display) && <span title={DISPLAY_LABELS[page.display]}><Hammer className="size-3.5 shrink-0 text-muted" aria-label={DISPLAY_LABELS[page.display]} /></span>}
                        {page.offerCount > 0 && <span className="font-mono text-[11px] text-muted tabular-nums">{page.offerCount}</span>}
                    </button>
                </div>
                {!needle && isOpen && kids.length > 0 && <ul>{kids.map(kid => row(kid, depth + 1))}</ul>}
            </li>
        );
    };

    const matches = needle
        ? tree.pages.filter(x => x.id !== tree.rootId && (x.localization.toLowerCase().includes(needle) || (x.name ?? '').toLowerCase().includes(needle)))
        : [];

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <Input type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Find a page" aria-label="Find a page" className="w-full pl-9" />
            </div>
            <ul className="flex flex-col">
                {needle
                    ? matches.length > 0
                        ? matches.slice(0, 100).map(page => row(page, 0, ancestorsOf(tree, page.id).map(x => x.localization).reverse().join(' / ')))
                        : <li className="px-2 py-3 text-sm text-muted">No page matches.</li>
                    : (children.get(tree.rootId) ?? []).map(page => row(page, 0))}
            </ul>
        </div>
    );
};
