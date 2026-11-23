import { Copy, ImageIcon, Trash2, Type, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { FONT_TYPES, type PluginFont, type PluginImage, useFontChange, useImageChange, usePluginFonts, usePluginImages } from '#/api/noCode';
import { folderOf, useWorkingOn } from '#/appearance/workingOn';
import { ask } from '#/components/confirm';
import { MediaThumb } from '#/components/ImagePicker';
import { toast, toastError } from '#/components/toast';
import { Button, EmptyState, ErrorNotice, FileButton, IconButton, Loading, PageBody, PageHeader, Panel } from '#/components/ui';
import { useHubTabs } from '#/layout/nav';

import { ThemePicker } from './ThemePicker';

const IMAGE_TYPES = 'image/png,image/gif,image/jpeg,image/webp';

const copy = (text: string) => void navigator.clipboard.writeText(text).then(() => toast(`Copied ${text}`));

/** A file's size as staff read it. */
const sizeOf = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

/** A picture's file name: its path without the folder every one is in (`styles/`). */
const fileOf = (path: string) => path.replace(/^styles\//, '');

/** One image as a tile: drawn on checks at its own pixels, its file and size, and copying what a patch or variable names it by. */
const ImageTile = ({ image, canManage, removing, onRemove }: { image: PluginImage; canManage: boolean; removing: boolean; onRemove: () => void }) => (
    <li className="flex min-w-0 flex-col overflow-clip rounded-lg border border-line bg-surface" data-image={image.path}>
        <MediaThumb url={image.url} large className="h-28 w-full rounded-none border-b border-line" />
        <div className="flex min-w-0 flex-col px-3 pt-2">
            <code className="truncate font-mono text-xs" title={image.path}>{fileOf(image.path)}</code>
            <span className="text-2xs text-muted">{sizeOf(image.bytes)}</span>
        </div>
        <div className="flex items-center gap-1 px-2 pt-1 pb-2">
            <Button small variant="ghost" icon={<Copy />} title={`Copy ${image.path}: what a patch's asset and an image style take`} onClick={() => copy(image.path)}>Path</Button>
            {image.url && <Button small variant="ghost" icon={<Copy />} title="Copy its address: what a variable such as asset.overlays takes" onClick={() => copy(image.url!)}>Address</Button>}
            {canManage && <IconButton small tone="bad" className="ml-auto" label={`Remove ${image.path}`} icon={<Trash2 />} disabled={removing} onClick={onRemove} />}
        </div>
    </li>
);

/**
 * The theme's images (its `wwwroot/styles/`) as a grid: upload one, copy the path a patch or an
 * image style names it by and the address a variable names it by, and take one away.
 */
const ImagesPanel = ({ pluginKey }: { pluginKey: string }) => {
    const { data, error } = usePluginImages(pluginKey);
    const change = useImageChange(pluginKey);

    return (
        <Panel
            title="Images"
            description="A patch's asset and an image style take the path; a variable (asset.overlays) takes the address."
            actions={data?.canManage && (
                <FileButton
                    accept={IMAGE_TYPES}
                    icon={<Upload />}
                    busy={change.isPending}
                    title="PNG, GIF, JPEG or WebP, at most 2 MB; one of the same name is replaced"
                    onFile={file => change.mutate({ file }, { onSuccess: image => toast(`Uploaded ${image!.path}.`), onError: toastError })}
                >
                    {change.isPending ? 'Uploading...' : 'Upload image'}
                </FileButton>
            )}
        >
            {error && <div className="p-4"><ErrorNotice error={error} /></div>}
            {!data && !error && <Loading />}
            {data && data.images.length === 0 && (
                <EmptyState>
                    {`No images in ${folderOf(pluginKey)}wwwroot/styles/ yet.${data.canManage ? ' Upload a PNG, GIF, JPEG or WebP, at most 2 MB.' : ''}`}
                </EmptyState>
            )}
            {data && data.images.length > 0 && (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-3 p-4">
                    {data.images.map(image => (
                        <ImageTile
                            key={image.path}
                            image={image}
                            canManage={data.canManage}
                            removing={change.isPending}
                            onRemove={() => ask(
                                { title: `Remove ${image.path}?`, body: 'A patch or style naming it draws nothing until an image of that name is uploaded again.', confirm: 'Remove', danger: true },
                                () => change.mutate({ path: image.path }, { onSuccess: () => toast(`Removed ${image.path}.`), onError: toastError }),
                            )}
                        />
                    ))}
                </ul>
            )}
        </Panel>
    );
};

/**
 * A font file loaded into this page under a name of its own, to draw its sample in; null until it
 * has loaded, or when it can't be (the sample is then drawn in the panel's own face).
 */
const usePreviewFont = (font: PluginFont) => {
    const name = `turbo-preview-${font.family}`;
    const [ loaded, setLoaded ] = useState<string | null>(null);

    useEffect(() => {
        if (!font.url) return;

        const face = new FontFace(name, `url(${JSON.stringify(font.url)})`);
        let live = true;

        face.load().then(
            (ready) => {
                document.fonts.add(ready);

                if (live) setLoaded(name);
            },
            // A file the browser can't read keeps the panel's face: the sample is only a look.
            () => undefined,
        );

        return () => {
            live = false;
            document.fonts.delete(face);
        };
    }, [ name, font.url ]);

    return loaded;
};

/** One font: a sample drawn in it, the family clients load it as, its file and size. */
const FontRow = ({ font, canManage, removing, onRemove }: { font: PluginFont; canManage: boolean; removing: boolean; onRemove: () => void }) => {
    const face = usePreviewFont(font);

    return (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" data-font={font.path}>
            <span aria-hidden className="grid h-12 w-16 shrink-0 place-items-center rounded-lg border border-line bg-canvas/50 text-xl" style={face ? { fontFamily: `"${face}"` } : undefined}>Aa</span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-medium">{font.family}</span>
                    <span className="truncate text-muted" style={face ? { fontFamily: `"${face}"` } : undefined}>The quick brown fox jumps over the lazy dog</span>
                </div>
                <div className="font-mono text-xs text-muted">{`${font.path} · ${sizeOf(font.bytes)}`}</div>
            </div>
            <span className="ml-auto flex items-center gap-1">
                <Button small variant="ghost" icon={<Copy />} title="Copy the family: what a font style property takes" onClick={() => copy(font.family)}>Family</Button>
                {canManage && <IconButton small tone="bad" label={`Remove ${font.path}`} icon={<Trash2 />} disabled={removing} onClick={onRemove} />}
            </span>
        </li>
    );
};

/**
 * The theme's fonts (its `wwwroot/styles/`): upload a WOFF2, WOFF, TrueType or OpenType file and
 * clients load it as the family its name says, which a font style property then picks; take one away
 * with its family.
 */
const FontsPanel = ({ pluginKey }: { pluginKey: string }) => {
    const { data, error } = usePluginFonts(pluginKey);
    const change = useFontChange(pluginKey);

    return (
        <Panel
            title="Fonts"
            description="A font is given to clients as the family its file name says: pixel.woff2 is pixel."
            actions={data?.canManage && (
                <FileButton
                    accept={FONT_TYPES}
                    icon={<Type />}
                    busy={change.isPending}
                    title="WOFF2, WOFF, TrueType or OpenType, at most 2 MB"
                    onFile={file => change.mutate({ file }, { onSuccess: font => toast(`Uploaded ${font!.path}: clients load it as ${font!.family}.`), onError: toastError })}
                >
                    {change.isPending ? 'Uploading...' : 'Upload font'}
                </FileButton>
            )}
        >
            {error && <div className="p-4"><ErrorNotice error={error} /></div>}
            {!data && !error && <Loading />}
            {data && data.fonts.length === 0 && <EmptyState>{`No fonts yet.${data.canManage ? ' Upload a WOFF2, WOFF, TTF or OTF, at most 2 MB.' : ''}`}</EmptyState>}
            <ul className="divide-y divide-line">
                {data?.fonts.map(font => (
                    <FontRow
                        key={font.path}
                        font={font}
                        canManage={data.canManage}
                        removing={change.isPending}
                        onRemove={() => ask(
                            { title: `Remove the font ${font.family}?`, body: 'A font style property naming it falls back to the client\'s own face.', confirm: 'Remove', danger: true },
                            () => change.mutate({ path: font.path }, { onSuccess: () => toast(`Removed ${font.path}.`), onError: toastError }),
                        )}
                    />
                ))}
            </ul>
        </Panel>
    );
};

/**
 * A theme's images and fonts (its `wwwroot/styles/`): the theme picked at the top, else the one
 * staff work on; uploads land in the theme shown. Upload, copy the path a patch or style names,
 * remove.
 */
export const ImagesPage = () => {
    const tabs = useHubTabs('themes');
    const working = useWorkingOn();
    const key = useParams().key ?? working.key;

    return (
        <>
            <PageHeader title="Images" tabs={tabs}>
                <ThemePicker value={key} to={next => `/appearance/images/${encodeURIComponent(next)}`} />
            </PageHeader>
            <PageBody>
                {key !== working.key && (
                    <p className="flex items-start gap-2 text-xs text-muted">
                        <ImageIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                        {`Showing ${folderOf(key)}: uploads here land in that theme, not in ${working.name}, the theme you work on.`}
                    </p>
                )}
                <ImagesPanel pluginKey={key} />
                <FontsPanel pluginKey={key} />
            </PageBody>
        </>
    );
};
