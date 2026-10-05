import { ArrowDown, ArrowUp, FolderPlus, Save, Trash2 } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import { catalogCalls, type CatalogPageDetail, type CatalogPageInput, type CatalogTree, iconUrl, imageUrl, useCatalogEdit } from '#/api/catalog';
import { Button, ErrorNotice, Field, Input, Labeled, Select, Switch, Textarea } from '#/components/ui';

import { ancestorsOf, childrenOf } from './tree';

const linesOf = (text: string) => text.split('\n').map(x => x.trimEnd());

const inputOf = (page: CatalogPageDetail): CatalogPageInput => ({
    localization: page.localization,
    name: page.name,
    icon: page.icon,
    layout: page.layout,
    imageData: page.imageData,
    textData: page.textData,
    visible: page.visible,
});

/**
 * One page's settings: its title, its name (the key the client opens it by), its icon, its layout
 * and the layout's images and texts in order, and whether it shows. Below them, where it sits:
 * up and down among its siblings, or under another page; a page under it; and deleting it, which
 * only an empty page allows.
 */
export const PageSettings = ({ tree, page, canManage, onOpen }: { tree: CatalogTree; page: CatalogPageDetail; canManage: boolean; onOpen: (id: number | null) => void }) => {
    const [ draft, setDraft ] = useState(() => inputOf(page));
    const [ images, setImages ] = useState(() => page.imageData.join('\n'));
    const [ texts, setTexts ] = useState(() => page.textData.join('\n'));
    const save = useCatalogEdit(catalogCalls.updatePage);
    const create = useCatalogEdit(catalogCalls.createPage);
    const move = useCatalogEdit(catalogCalls.movePage);
    const remove = useCatalogEdit(catalogCalls.deletePage);
    const children = useMemo(() => childrenOf(tree), [ tree ]);
    const isRoot = page.parentId === null;
    const siblings = page.parentId === null ? [] : (children.get(page.parentId) ?? []);
    const index = siblings.findIndex(x => x.id === page.id);
    const icon = iconUrl(tree, draft.icon);

    // Anywhere but under itself or what sits below it.
    const parents = useMemo(() => tree.pages
        .filter(x => x.id !== page.id && !ancestorsOf(tree, x.id).some(a => a.id === page.id))
        .map(x => ({ id: x.id, label: x.id === tree.rootId ? 'Top level' : [ ...ancestorsOf(tree, x.id).map(a => a.localization).reverse(), x.localization ].join(' / ') }))
        .sort((a, b) => (a.id === tree.rootId ? -1 : b.id === tree.rootId ? 1 : a.label.localeCompare(b.label))), [ tree, page.id ]);

    const set = <K extends keyof CatalogPageInput>(key: K, value: CatalogPageInput[K]) => setDraft({ ...draft, [key]: value });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        save.mutate([ page.id, { ...draft, imageData: linesOf(images), textData: linesOf(texts) } ]);
    };

    const error = save.error ?? create.error ?? move.error ?? remove.error;

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-2">
                <Field label="Title" name="page-title" value={draft.localization} onChange={event => set('localization', event.target.value)} maxLength={50} required disabled={!canManage} />
                <Field
                    label="Name"
                    name="page-name"
                    value={draft.name ?? ''}
                    onChange={event => set('name', event.target.value || null)}
                    maxLength={50}
                    hint="The key the client opens it by, e.g. from a link."
                    disabled={!canManage}
                    className="font-mono"
                />
                <Labeled label="Icon" hint="The number of an icon_<n>.png; 0 for none.">
                    <div className="flex items-center gap-2">
                        <Input type="number" min={0} value={draft.icon} onChange={event => set('icon', Math.max(0, Number(event.target.value) || 0))} disabled={!canManage} className="w-28 font-mono" aria-label="Icon" />
                        <span className="grid size-9 place-items-center rounded-lg border border-line bg-canvas">
                            {icon && <img src={icon} alt="" className="max-h-6 max-w-6 [image-rendering:pixelated]" />}
                        </span>
                    </div>
                </Labeled>
                <Labeled
                    label="Layout"
                    hint={draft.layout === 'club_buy'
                        ? 'The club window: lists every shown Habbo Club membership.'
                        : draft.layout === 'club_gifts'
                            ? 'Lists the club gifts members claim.'
                            : undefined}
                >
                    <Select value={draft.layout} onChange={event => set('layout', event.target.value)} disabled={!canManage} aria-label="Layout">
                        {tree.layouts.map(layout => <option key={layout} value={layout}>{layout}</option>)}
                    </Select>
                </Labeled>
                <Labeled label="Images" hint="One per line, in the layout's order: the name of a catalogue image, without .png.">
                    <Textarea value={images} onChange={event => setImages(event.target.value)} rows={3} disabled={!canManage} className="font-mono text-xs" />
                </Labeled>
                <Labeled label="Texts" hint="One per line, in the layout's order. A line may hold HTML the client understands.">
                    <Textarea value={texts} onChange={event => setTexts(event.target.value)} rows={3} disabled={!canManage} />
                </Labeled>
                {linesOf(images).some(x => x.trim()) && (
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                        {linesOf(images).map((name, i) => {
                            const url = imageUrl(tree, name);

                            return url && <img key={i} src={url} alt={name} title={name} loading="lazy" className="max-h-24 rounded border border-line bg-canvas" />;
                        })}
                    </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                    <Switch label="Shown in the catalog" checked={draft.visible} onChange={value => set('visible', value)} disabled={!canManage} />
                    {canManage && <Button type="submit" icon={<Save />} disabled={save.isPending}>Save page</Button>}
                </div>
            </form>

            {canManage && (
                <div className="flex flex-col gap-3 border-t border-line p-4">
                    {!isRoot && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="secondary" icon={<ArrowUp />} disabled={index <= 0 || move.isPending} onClick={() => move.mutate([ page.id, page.parentId!, index - 1 ])}>Up</Button>
                            <Button variant="secondary" icon={<ArrowDown />} disabled={index < 0 || index >= siblings.length - 1 || move.isPending} onClick={() => move.mutate([ page.id, page.parentId!, index + 1 ])}>Down</Button>
                            <Select
                                value=""
                                onChange={(event) => {
                                    const parentId = Number(event.target.value);

                                    if (parentId)
                                        move.mutate([ page.id, parentId, (children.get(parentId) ?? []).length ]);
                                }}
                                aria-label="Move under"
                                className="min-w-0 flex-1 sm:max-w-80"
                            >
                                <option value="">Move under…</option>
                                {parents.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                            </Select>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="secondary"
                            icon={<FolderPlus />}
                            disabled={create.isPending}
                            onClick={() => create.mutate([ { parentId: page.id, localization: 'New page', name: null, icon: 0, layout: 'default_3x3', imageData: [], textData: [], visible: false } ], {
                                onSuccess: saved => onOpen(saved.id),
                            })}
                        >
                            Add a page under it
                        </Button>
                        {!isRoot && (
                            <Button
                                variant="danger"
                                icon={<Trash2 />}
                                disabled={remove.isPending}
                                onClick={() => window.confirm(`Delete the page "${page.localization}"?`) && remove.mutate([ page.id ], { onSuccess: () => onOpen(page.parentId) })}
                            >
                                Delete page
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-muted">A new page starts hidden, so it can be set up before anyone sees it.</p>
                </div>
            )}
            {error && <div className="px-4 pb-4"><ErrorNotice error={error} /></div>}
        </div>
    );
};
