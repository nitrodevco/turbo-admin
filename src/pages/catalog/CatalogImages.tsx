import { useQuery } from '@tanstack/react-query';
import { ImageOff, Images, RefreshCw, Trash2, Upload } from 'lucide-react';
import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react';

import { type CatalogTree } from '#/api/catalog';
import { catalogIconPath, type CatalogImage, type CatalogImageShow, useCatalogIcons, useCatalogImages, useDeleteCatalogIcon, useDeleteCatalogImage, useUploadCatalogIcon, useUploadCatalogImage } from '#/api/catalogImages';
import { type MediaImage } from '#/api/media';
import { ask } from '#/components/confirm';
import { Modal } from '#/components/Modal';
import { Pagination } from '#/components/Pagination';
import { SearchInput } from '#/components/SearchInput';
import { toast, toastError } from '#/components/toast';
import { Button, EmptyState, ErrorNotice, IconButton, Input, Labeled, Loading, Segmented, TextButton } from '#/components/ui';
import { cx } from '#/lib/cx';
import { useDebounced } from '#/lib/debounce';
import { apiImageQuery } from '#/preview/images';

import { CatalogImageThumb, CHECKS } from './CatalogImageThumb';

const PAGE_SIZE = 60;

/** What the tab lists: the pictures pages show, or the icons beside their names. */
type Section = 'pictures' | 'icons';

const SECTIONS: { value: Section; label: string }[] = [
    { value: 'pictures', label: 'Pictures' },
    { value: 'icons', label: 'Icons' },
];

const SHOWS: { value: CatalogImageShow; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unused', label: 'Not used' },
];

/** A file's name as a picture's: without its extension, and only the characters a name may hold. */
const nameOfFile = (file: string) => file.replace(/\.(gif|png)$/i, '').replace(/[^\w.-]+/g, '_');

/** The number an icon's file is named with (`icon_12.png`), or none. */
const numberOfFile = (file: string) => /icon_(\d+)\.png$/i.exec(file)?.[1] ?? '';

const sizeOf = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`);

interface PageLink {
    id: number;
    title: string;
}

/** The pages that show a picture or an icon, each a link to open it; one none shows says so. */
const ShownOn = ({ pages, onOpenPage }: { pages: PageLink[]; onOpenPage: (id: number) => void }) => {
    if (pages.length === 0)
        return <span className="text-muted">On no page</span>;

    return (
        <span className="line-clamp-2">
            On
            {' '}
            {pages.slice(0, 2).map((page, i) => (
                <span key={page.id}>
                    {i > 0 && ', '}
                    <TextButton inline onClick={() => onOpenPage(page.id)}>{page.title}</TextButton>
                </span>
            ))}
            {pages.length > 2 && <span title={pages.slice(2).map(x => x.title).join(', ')}>{` and ${pages.length - 2} more`}</span>}
        </span>
    );
};

/** What a card does for staff who may: put another file in its place, or delete it. */
const CardActions = ({ name, onReplace, onDelete }: { name: string; onReplace: () => void; onDelete: () => void }) => (
    <div className="mt-auto flex items-center gap-1 pt-1">
        <Button variant="ghost" icon={<RefreshCw />} onClick={onReplace} small className="flex-1 justify-start">
            Replace
        </Button>
        <IconButton label={`Delete ${name}`} icon={<Trash2 />} tone="bad" small onClick={onDelete} />
    </div>
);

const ImageCard = ({ image, canManage, onOpenPage, onReplace, onDelete }: { image: CatalogImage; canManage: boolean; onOpenPage: (id: number) => void; onReplace: () => void; onDelete: () => void }) => (
    <li className="card flex flex-col overflow-hidden">
        <CatalogImageThumb image={image} className="h-32 w-full rounded-none border-0 border-b p-2" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5 text-xs">
            <span title={image.file} className="line-clamp-2 font-mono text-ui break-all text-ink">{image.name}</span>
            <span className="text-muted">{`${image.file.endsWith('.png') ? 'PNG' : 'GIF'} · ${sizeOf(image.size)}`}</span>
            <ShownOn pages={image.pages} onOpenPage={onOpenPage} />
            {canManage && <CardActions name={image.name} onReplace={onReplace} onDelete={onDelete} />}
        </div>
    </li>
);

/** A page's icon as this server has it, by the number a page stores for it. */
const IconCard = ({ icon, pages, canManage, onOpenPage, onReplace, onDelete }: { icon: MediaImage; pages: PageLink[]; canManage: boolean; onOpenPage: (id: number) => void; onReplace: () => void; onDelete: () => void }) => {
    const picture = useQuery(apiImageQuery(icon.values.catalogIcon ? catalogIconPath(icon.values.catalogIcon, icon) : null));
    const name = `Icon ${icon.values.catalogIcon ?? icon.name}`;

    return (
        <li className="card flex flex-col overflow-hidden">
            <span className={cx('grid h-16 w-full place-items-center border-b border-line p-2', CHECKS)}>
                {picture.data
                    ? <img src={picture.data.src} alt="" className="max-h-full max-w-full object-contain [image-rendering:pixelated]" />
                    : picture.isError && <ImageOff className="size-4 text-muted" aria-label="Can't be drawn" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5 text-xs">
                <span title={icon.name} className="font-mono text-ui text-ink">{name}</span>
                <span className="text-muted">{sizeOf(icon.bytes)}</span>
                <ShownOn pages={pages} onOpenPage={onOpenPage} />
                {canManage && <CardActions name={name} onReplace={onReplace} onDelete={onDelete} />}
            </div>
        </li>
    );
};

/** What an upload is of, and the one it replaces: a picture's name or an icon's number, null for a new one. */
interface Uploading {
    section: Section;
    name: string | null;
}

/**
 * Uploading a picture or an icon: a file dropped or chosen, a picture named as its file unless
 * named otherwise and an icon by its number, shown before it goes. Replacing one starts with its
 * name or number, which stays.
 */
const UploadDialog = ({ section, name: fixedName, taken, onClose }: Uploading & { taken: (name: string) => boolean; onClose: () => void }) => {
    const icon = section === 'icons';
    const [ file, setFile ] = useState<File | null>(null);
    const [ name, setName ] = useState(fixedName ?? '');
    const [ over, setOver ] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const uploadPicture = useUploadCatalogImage();
    const uploadIcon = useUploadCatalogIcon();
    const pending = uploadPicture.isPending || uploadIcon.isPending;

    const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [ file ]);

    // The chosen file's address goes with it.
    useEffect(() => () => {
        if (preview)
            URL.revokeObjectURL(preview);
    }, [ preview ]);

    const choose = (picked: File | undefined) => {
        if (!picked)
            return;

        setFile(picked);

        if (!fixedName)
            setName(icon ? numberOfFile(picked.name) : nameOfFile(picked.name));
    };

    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setOver(false);
        choose(event.dataTransfer.files[0]);
    };

    const trimmed = name.trim();
    const replaces = !fixedName && trimmed !== '' && taken(trimmed);

    const submit = () => {
        if (!file || !trimmed)
            return;

        if (!icon) {
            uploadPicture.mutate({ file, name: trimmed }, {
                onSuccess: (image) => {
                    toast(`Uploaded ${image.file}. Publish the assets for players to see it.`);
                    onClose();
                },
                onError: toastError,
            });

            return;
        }

        uploadIcon.mutate({ file, number: trimmed }, {
            onSuccess: () => {
                toast(`Uploaded icon ${trimmed}. Publish the assets for players to see it.`);
                onClose();
            },
            onError: toastError,
        });
    };

    const title = icon
        ? fixedName ? `Replace icon ${fixedName}` : 'Upload an icon'
        : fixedName ? `Replace ${fixedName}` : 'Upload a picture';

    return (
        <Modal title={title} open onClose={onClose} className="sm:max-w-lg">
            <form
                className="flex flex-col gap-4 p-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
            >
                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setOver(true);
                    }}
                    onDragLeave={() => setOver(false)}
                    onDrop={onDrop}
                    className={cx(
                        'grid min-h-44 place-items-center rounded-xl border-2 border-dashed p-3 text-sm text-muted transition-colors',
                        over ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong',
                        preview && CHECKS,
                    )}
                >
                    {preview
                        ? <img src={preview} alt="" className="max-h-60 max-w-full object-contain [image-rendering:pixelated]" />
                        : (
                                <span className="flex flex-col items-center gap-2">
                                    <Upload className="size-6" />
                                    {icon ? 'Drop a PNG here, or choose one' : 'Drop a GIF or PNG here, or choose one'}
                                </span>
                            )}
                </button>
                <input ref={input} type="file" accept={icon ? 'image/png' : 'image/gif,image/png'} className="sr-only" onChange={event => choose(event.target.files?.[0])} />
                {!fixedName && (icon
                    ? (
                            <Labeled label="Number" hint={replaces ? 'An icon has this number: this replaces it.' : 'What a page stores to show it. The client loads it as icon_<number>.png.'}>
                                <Input value={name} onChange={event => setName(event.target.value.replace(/\D/g, '').slice(0, 9))} inputMode="numeric" placeholder="12" className="w-full font-mono" />
                            </Labeled>
                        )
                    : (
                            <Labeled label="Name" hint={replaces ? 'A picture has this name: this replaces it.' : 'What a page gives to show it. The client loads it as the name with .gif after it.'}>
                                <Input value={name} onChange={event => setName(event.target.value)} spellCheck={false} placeholder="catalog_header_mine" className="w-full font-mono" />
                            </Labeled>
                        ))}
                {file && <p className="text-xs text-muted">{`${file.name} · ${sizeOf(file.size)}`}</p>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" icon={<Upload />} disabled={!file || !trimmed || pending}>{pending ? 'Uploading…' : replaces || fixedName ? 'Replace' : 'Upload'}</Button>
                </div>
            </form>
        </Modal>
    );
};

/** What a section's list is asked for, and what it tells the tab. */
interface ListProps {
    tree: CatalogTree;
    q: string;
    show: CatalogImageShow;
    page: number;
    onPage: (page: number) => void;
    onOpenPage: (id: number) => void;
    /** A new upload asked for from the page's header. */
    adding: boolean;
    onAdded: () => void;
}

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3';

const Pages = ({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) => (total > PAGE_SIZE
    ? <Pagination offset={page * PAGE_SIZE} limit={PAGE_SIZE} total={total} onChange={offset => onPage(Math.floor(offset / PAGE_SIZE))} />
    : null);

/** The pictures - the headers and teasers pages show - as the files in the server's catalog pictures folder. */
const PictureList = ({ tree, q, show, page, onPage, onOpenPage, adding, onAdded }: ListProps) => {
    const [ replacing, setReplacing ] = useState<string | null>(null);
    const result = useCatalogImages({ q, show, page, size: PAGE_SIZE });
    const remove = useDeleteCatalogImage();
    const data = result.data;
    const items = data?.items ?? [];

    const doDelete = (image: CatalogImage) => {
        ask({
            title: `Delete ${image.name}?`,
            body: image.pages.length > 0
                ? `${image.pages.length === 1 ? 'A page shows' : `${image.pages.length} pages show`} it; they'll show nothing there. A picture from Habbo is taken again by the next sync while a page names it.`
                : 'Its file goes from this server. Published copies stay until the assets are published again.',
            confirm: 'Delete',
            danger: true,
        }, () => remove.mutate(image.name, {
            onSuccess: () => toast(`Deleted ${image.name}.`),
            onError: toastError,
        }));
    };

    return (
        <>
            {result.error && <ErrorNotice error={result.error} />}
            {result.isPending && <Loading />}
            {data && items.length === 0 && (
                <EmptyState framed icon={<Images />}>
                    {q ? `No picture's name holds “${q}”.` : show === 'unused' ? 'Every picture is on a page.' : 'The catalog pictures folder is empty. Upload one, or a sync takes those the pages name from Habbo.'}
                </EmptyState>
            )}
            {items.length > 0 && (
                <ul className={cx(GRID, result.isPlaceholderData && 'opacity-60')}>
                    {items.map(image => (
                        <ImageCard
                            key={image.file}
                            image={image}
                            canManage={tree.canManage}
                            onOpenPage={onOpenPage}
                            onReplace={() => setReplacing(image.name)}
                            onDelete={() => doDelete(image)}
                        />
                    ))}
                </ul>
            )}
            {data && <Pages page={page} total={data.total} onPage={onPage} />}

            {(replacing !== null || adding) && (
                <UploadDialog
                    key={replacing ?? 'new'}
                    section="pictures"
                    name={replacing}
                    taken={name => items.some(x => x.name === name)}
                    onClose={() => {
                        setReplacing(null);
                        onAdded();
                    }}
                />
            )}
        </>
    );
};

/** The icons beside the pages' names, as the files in the server's catalog icons folder, each by its number. */
const IconList = ({ tree, q, show, page, onPage, onOpenPage, adding, onAdded }: ListProps) => {
    const [ replacing, setReplacing ] = useState<string | null>(null);
    // A number alone is looked for as an icon's own.
    const result = useCatalogIcons({ q: /^\d+$/.test(q) ? `icon_${q}` : q, show, page, size: PAGE_SIZE });
    const remove = useDeleteCatalogIcon();
    const data = result.data;
    const items = data?.items ?? [];

    const pagesOf = useMemo(() => {
        const byIcon = new Map<number, PageLink[]>();

        for (const node of tree.pages) {
            if (node.icon <= 0)
                continue;

            byIcon.set(node.icon, [ ...byIcon.get(node.icon) ?? [], { id: node.id, title: node.localization } ]);
        }

        return (icon: MediaImage) => byIcon.get(icon.values.catalogIcon ?? 0) ?? [];
    }, [ tree.pages ]);

    const numberOf = (icon: MediaImage) => String(icon.values.catalogIcon ?? numberOfFile(icon.name));

    const doDelete = (icon: MediaImage) => {
        ask({
            title: `Delete icon ${numberOf(icon)}?`,
            body: 'Its file goes from this server. Published copies stay until the assets are published again. An icon a page shows is kept: change the page first.',
            confirm: 'Delete',
            danger: true,
        }, () => remove.mutate(numberOf(icon), {
            onSuccess: () => toast(`Deleted icon ${numberOf(icon)}.`),
            onError: toastError,
        }));
    };

    return (
        <>
            {result.error && <ErrorNotice error={result.error} />}
            {result.isPending && <Loading />}
            {data && items.length === 0 && (
                <EmptyState framed icon={<Images />}>
                    {q ? `No icon's name holds “${q}”.` : show === 'unused' ? 'Every icon is on a page.' : 'The catalog icons folder is empty. Upload one, or a sync takes Habbo\'s.'}
                </EmptyState>
            )}
            {items.length > 0 && (
                <ul className={cx('grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3', result.isPlaceholderData && 'opacity-60')}>
                    {items.map(icon => (
                        <IconCard
                            key={icon.id}
                            icon={icon}
                            pages={pagesOf(icon)}
                            canManage={tree.canManage}
                            onOpenPage={onOpenPage}
                            onReplace={() => setReplacing(numberOf(icon))}
                            onDelete={() => doDelete(icon)}
                        />
                    ))}
                </ul>
            )}
            {data && <Pages page={page} total={data.total} onPage={onPage} />}

            {(replacing !== null || adding) && (
                <UploadDialog
                    key={replacing ?? 'new'}
                    section="icons"
                    name={replacing}
                    taken={number => items.some(x => numberOf(x) === number)}
                    onClose={() => {
                        setReplacing(null);
                        onAdded();
                    }}
                />
            )}
        </>
    );
};

/**
 * The catalog's images as the files this server keeps: the pictures its pages show (headers and
 * teasers) and the icons beside their names, each with the pages that show it. An upload - asked
 * for from the page's header (`adding`) - goes into the folder and reaches players once the assets
 * are published.
 */
export const CatalogImages = ({ tree, adding, onAdded, onOpenPage }: { tree: CatalogTree; adding: boolean; onAdded: () => void; onOpenPage: (id: number) => void }) => {
    const [ section, setSection ] = useState<Section>('pictures');
    const [ text, setText ] = useState('');
    const [ show, setShow ] = useState<CatalogImageShow>('all');
    const [ page, setPage ] = useState(0);
    const q = useDebounced(text.trim());
    const List = section === 'icons' ? IconList : PictureList;
    const what = section === 'icons' ? 'an icon' : 'a picture';

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-auto sm:min-w-56">
                    <Segmented
                        label="Which images"
                        value={section}
                        onChange={(value) => {
                            setSection(value as Section);
                            setPage(0);
                        }}
                        options={SECTIONS}
                    />
                </div>
                <SearchInput
                    value={text}
                    onValueChange={(value) => {
                        // A new search starts from its first page.
                        setText(value);
                        setPage(0);
                    }}
                    placeholder={`Find ${what}`}
                    aria-label={`Find ${what}`}
                    className="w-full sm:w-64"
                />
                <div className="w-full sm:w-auto sm:min-w-56">
                    <Segmented
                        label={section === 'icons' ? 'Which icons' : 'Which pictures'}
                        value={show}
                        onChange={(value) => {
                            setShow(value as CatalogImageShow);
                            setPage(0);
                        }}
                        options={SHOWS}
                    />
                </div>
            </div>

            <List key={section} tree={tree} q={q} show={show} page={page} onPage={setPage} onOpenPage={onOpenPage} adding={adding} onAdded={onAdded} />
        </div>
    );
};
