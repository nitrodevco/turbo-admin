import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type AssetJob, postForm } from './bundles';
import { api, post, remove } from './client';
import { type MediaImage } from './media';

/**
 * A catalog picture - a page's header or teaser - as a file in the server's `images/catalog`
 * folder: its name as a page gives it, its file (`<name>.gif`), and the pages that show it.
 */
export interface CatalogImage {
    name: string;
    file: string;
    size: number;
    updatedAtUtc: string | null;
    pages: { id: number; title: string }[];
}

export type CatalogImageShow = 'all' | 'unused';

export interface CatalogImageQuery {
    q: string;
    show: CatalogImageShow;
    page: number;
    size: number;
}

/** The file a page's picture is loaded from, as the server finds it: `.gif` after the name unless it names a GIF or PNG. */
const fileOf = (name: string) => (/\.(gif|png)$/i.test(name) ? name : `${name}.gif`);

/** The picture a page's value names, when the server has it. */
export const findImage = (images: CatalogImage[] | undefined, value: string) =>
    value ? images?.find(x => x.name === value || x.file === fileOf(value)) ?? null : null;

/** The most the server lists at once: every picture, for the picker to search. */
const EVERY = 5000;

/**
 * Where a picture's file is drawn from, through the admin API. The version (when it was last
 * written) makes a replaced picture a new address, so the old one isn't shown from the cache.
 */
export const catalogImagePath = (image: Pick<CatalogImage, 'name' | 'updatedAtUtc'>) =>
    `/catalog/images/${encodeURIComponent(image.name)}/file${image.updatedAtUtc ? `?v=${encodeURIComponent(image.updatedAtUtc)}` : ''}`;

export const useCatalogImages = (query: CatalogImageQuery) => useQuery({
    queryKey: [ 'catalog', 'images', query ],
    queryFn: () => api<{ total: number; items: CatalogImage[] }>(`/catalog/images?${new URLSearchParams({ q: query.q, show: query.show, page: String(query.page), size: String(query.size) })}`),
    placeholderData: previous => previous,
});

/** Every picture, for the picker to find among as it is typed into. */
export const useAllCatalogImages = (enabled = true) => useQuery({
    queryKey: [ 'catalog', 'images', 'every' ],
    queryFn: () => api<{ total: number; items: CatalogImage[] }>(`/catalog/images?size=${EVERY}`),
    enabled,
    staleTime: 60_000,
});

const useRefreshImages = () => {
    const queryClient = useQueryClient();

    return () => void queryClient.invalidateQueries({ queryKey: [ 'catalog', 'images' ] });
};

/** Uploads a GIF or PNG as a picture, named as given or else as the file. */
export const useUploadCatalogImage = () => {
    const refresh = useRefreshImages();

    return useMutation({
        mutationFn: ({ file, name }: { file: File; name: string }) => {
            const form = new FormData();

            form.append('file', file);
            form.append('name', name);

            return postForm<CatalogImage>('/catalog/images', form);
        },
        onSuccess: refresh,
    });
};

/**
 * Takes Habbo's pictures of these names in, those the hotel lacks, as an asset job: it runs on
 * the Assets page, and players see the pictures once the assets are published.
 */
export const useFetchCatalogPictures = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (names: string[]) => post<AssetJob>('/catalog/images/habbo', { names }),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ 'assets' ] }),
    });
};

/** Where an icon's file is drawn from, through the admin API; its version makes a replaced one a new address. */
export const catalogIconPath = (number: number, icon: Pick<MediaImage, 'modifiedUtc'>) =>
    `/catalog/icons/${number}/file${icon.modifiedUtc ? `?v=${encodeURIComponent(icon.modifiedUtc)}` : ''}`;

/** The pages' icons (`icon_<n>.png`), as the media library indexes them, by number. */
export const useCatalogIcons = (query: CatalogImageQuery) => useQuery({
    queryKey: [ 'catalog', 'icons', query ],
    queryFn: () => api<{ total: number; items: MediaImage[] }>(`/catalog/icons?${new URLSearchParams({ q: query.q, show: query.show, page: String(query.page), size: String(query.size) })}`),
    placeholderData: previous => previous,
});

/** An icon changed here is one the media library's index, which the picker searches, must read again. */
const useRefreshIcons = () => {
    const queryClient = useQueryClient();

    return () => {
        void queryClient.invalidateQueries({ queryKey: [ 'catalog', 'icons' ] });
        void queryClient.invalidateQueries({ queryKey: [ 'media' ] });
    };
};

/** Uploads a PNG as the icon of a number, replacing the one it has. */
export const useUploadCatalogIcon = () => {
    const refresh = useRefreshIcons();

    return useMutation({
        mutationFn: ({ file, number }: { file: File; number: string }) => {
            const form = new FormData();

            form.append('file', file);
            form.append('number', number);

            return postForm<MediaImage>('/catalog/icons', form);
        },
        onSuccess: refresh,
    });
};

/** Deletes an icon no page shows; the server refuses one a page does. */
export const useDeleteCatalogIcon = () => {
    const refresh = useRefreshIcons();

    return useMutation({
        mutationFn: (number: string) => remove<void>(`/catalog/icons/${number}`),
        onSuccess: refresh,
    });
};

export const useDeleteCatalogImage = () => {
    const refresh = useRefreshImages();

    return useMutation({
        mutationFn: (name: string) => remove<void>(`/catalog/images/${encodeURIComponent(name)}`),
        onSuccess: refresh,
    });
};
