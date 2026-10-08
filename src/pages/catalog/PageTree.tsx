import { useDndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, EyeOff, FolderPlus, GripVertical, Hammer, Search } from 'lucide-react';
import { useState } from 'react';

import { catalogIconUrl, useClientAssets } from '#/api/assets';
import { type CatalogPageNode, type CatalogTree } from '#/api/catalog';
import { Input } from '#/components/ui';
import { cx } from '#/lib/cx';

import { DISPLAY_LABELS, inBuildersClub } from './labels';
import { ancestorsOf } from './tree';
import { type FlatRow, INDENT, pageDragId, type Projection } from './treeDrag';

export const PageIcon = ({ icon, className }: { icon: number; className?: string }) => {
    const url = catalogIconUrl(useClientAssets(), icon);

    return (
        <span className={cx('grid size-5 shrink-0 place-items-center', className)}>
            {url && <img src={url} alt="" loading="lazy" className="max-h-5 max-w-5 [image-rendering:pixelated]" onError={event => (event.currentTarget.style.display = 'none')} />}
        </span>
    );
};

/** What a row looks like, in the tree and under the pointer while it is dragged. */
export const PageRowBody = ({ page, path, dropTarget }: { page: CatalogPageNode; path?: string; dropTarget?: boolean }) => (
    <>
        <PageIcon icon={page.icon} />
        <span className={cx('min-w-0 flex-1 truncate', (page.display === 'invisible' || page.display === 'bc_only') && !dropTarget && 'text-muted')}>
            {page.localization}
            {path && <span className="ml-1.5 text-xs text-muted">{path}</span>}
        </span>
        {page.display === 'invisible' && <EyeOff className="size-3.5 shrink-0 text-muted" aria-label="hidden" />}
        {inBuildersClub(page.display) && <span title={DISPLAY_LABELS[page.display]}><Hammer className="size-3.5 shrink-0 text-muted" aria-label={DISPLAY_LABELS[page.display]} /></span>}
        {page.offerCount > 0 && <span className="font-mono text-[11px] text-muted tabular-nums">{page.offerCount}</span>}
    </>
);

interface RowProps {
    row: FlatRow;
    selected: boolean;
    open: boolean;
    canManage: boolean;
    /** The depth the dragged page would take, drawn on its placeholder. */
    projectedDepth: number | null;
    path?: string;
    searching: boolean;
    onToggle: () => void;
    onSelect: () => void;
    onAddUnder: () => void;
}

const Row = ({ row, selected, open, canManage, projectedDepth, path, searching, onToggle, onSelect, onAddUnder }: RowProps) => {
    const { page } = row;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
        id: pageDragId(page.id),
        data: { kind: 'page', id: page.id },
        disabled: { draggable: !canManage || searching, droppable: false },
    });
    const { active } = useDndContext();
    // An offer held over a page: dropping it moves the offer there.
    const offerOver = isOver && active?.data.current?.kind === 'offer';
    const depth = isDragging && projectedDepth !== null ? projectedDepth : row.depth;

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cx('relative', isDragging && 'z-10')}
        >
            <div
                className={cx(
                    'group flex min-h-11 items-center gap-1 rounded-lg pr-1.5 text-sm transition-colors sm:min-h-8',
                    isDragging
                        ? 'border border-dashed border-accent bg-accent-soft/60 opacity-70'
                        : offerOver
                            ? 'bg-accent text-on-accent shadow-[0_0_0_3px_var(--color-accent-soft)]'
                            : selected ? 'bg-accent-soft text-accent' : 'hover:bg-subtle',
                )}
                style={{ paddingLeft: `${2 + depth * INDENT}px` }}
            >
                <button
                    type="button"
                    aria-label={open ? `Close ${page.localization}` : `Open ${page.localization}`}
                    onClick={onToggle}
                    className={cx('grid size-6 shrink-0 place-items-center rounded text-muted hover:text-ink', (!row.hasChildren || searching) && 'invisible')}
                >
                    <ChevronRight className={cx('size-3.5 transition-transform', open && 'rotate-90')} />
                </button>
                <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <PageRowBody page={page} path={path} dropTarget={offerOver} />
                </button>
                {canManage && !searching && (
                    <>
                        <button
                            type="button"
                            onClick={onAddUnder}
                            title={`Add a page under ${page.localization}`}
                            aria-label={`Add a page under ${page.localization}`}
                            className="grid size-6 shrink-0 place-items-center rounded text-muted opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-accent focus-visible:opacity-100 max-sm:hidden"
                        >
                            <FolderPlus className="size-3.5" />
                        </button>
                        <span
                            {...attributes}
                            {...listeners}
                            aria-label={`Move ${page.localization}`}
                            title="Drag to move; sideways to go in or out a level"
                            className="grid size-6 shrink-0 cursor-grab touch-none place-items-center rounded text-muted/60 hover:bg-surface hover:text-ink active:cursor-grabbing"
                        >
                            <GripVertical className="size-3.5" />
                        </span>
                    </>
                )}
            </div>
        </li>
    );
};

interface PageTreeProps {
    tree: CatalogTree;
    rows: FlatRow[];
    open: Set<number>;
    selected: number | null;
    projection: Projection | null;
    onToggle: (id: number) => void;
    onSelect: (id: number) => void;
    onAddUnder: (id: number) => void;
}

/**
 * The catalog's pages as the client's navigator shows them, the root's children at the top, marked
 * where they are hidden or shown in the Builders Club catalog. A page is dragged by its grip: up and
 * down among the others, sideways to go under the page above or back out; an offer dragged from the
 * page onto a row moves there. A search shows every page whose title or name matches, with where it
 * sits, and nothing moves while it does.
 */
export const PageTree = ({ tree, rows, open, selected, projection, onToggle, onSelect, onAddUnder }: PageTreeProps) => {
    const [ filter, setFilter ] = useState('');
    const needle = filter.trim().toLowerCase();
    const searching = needle.length > 0;

    const matches: FlatRow[] = searching
        ? tree.pages
                .filter(x => x.id !== tree.rootId && (x.localization.toLowerCase().includes(needle) || (x.name ?? '').toLowerCase().includes(needle)))
                .slice(0, 100)
                .map(page => ({ page, parentId: page.parentId ?? tree.rootId, depth: 0, hasChildren: false }))
        : [];
    const shown = searching ? matches : rows;

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <Input type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Find a page" aria-label="Find a page" className="w-full pl-9" />
            </div>
            <SortableContext items={shown.map(x => pageDragId(x.page.id))} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col">
                    {shown.length === 0 && <li className="px-2 py-3 text-sm text-muted">{searching ? 'No page matches.' : 'No pages yet.'}</li>}
                    {shown.map(row => (
                        <Row
                            key={row.page.id}
                            row={row}
                            selected={selected === row.page.id}
                            open={open.has(row.page.id)}
                            canManage={tree.canManage}
                            projectedDepth={projection?.depth ?? null}
                            path={searching ? ancestorsOf(tree, row.page.id).map(x => x.localization).reverse().join(' / ') : undefined}
                            searching={searching}
                            onToggle={() => onToggle(row.page.id)}
                            onSelect={() => onSelect(row.page.id)}
                            onAddUnder={() => onAddUnder(row.page.id)}
                        />
                    ))}
                </ul>
            </SortableContext>
        </div>
    );
};
