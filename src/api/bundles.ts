import { keepPreviousData, type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '#/auth/session';

import { api, API_URL, ApiError, post, put, remove } from './client';

/**
 * The asset bundles the client draws furniture, effects and pets from: kept on this server, taken
 * from Habbo by a sync, checked against the hotel, and published to where the client loads them
 * (`docs/asset-bundles.md`).
 */
export type BundleKind = 'furniture' | 'figure' | 'effect' | 'pet';

export type BundleStatus = 'all' | 'ok' | 'failed' | 'unused';

export type TargetProtocol = 'folder' | 'ftp' | 'ftps' | 'sftp';

export const BUNDLE_KINDS: { value: BundleKind; label: string; one: string }[] = [
    { value: 'furniture', label: 'Furniture', one: 'furniture' },
    { value: 'figure', label: 'Clothing', one: 'clothing' },
    { value: 'effect', label: 'Effects', one: 'effect' },
    { value: 'pet', label: 'Pets', one: 'pet' },
];

export const PROTOCOLS: { value: TargetProtocol; label: string }[] = [
    { value: 'folder', label: 'Folder' },
    { value: 'ftp', label: 'FTP' },
    { value: 'ftps', label: 'FTPS' },
    { value: 'sftp', label: 'SFTP' },
];

/** The port a protocol uses when the target's is 0. */
export const DEFAULT_PORTS: Record<TargetProtocol, number> = { folder: 0, ftp: 21, ftps: 21, sftp: 22 };

/** A sync or a publish: one runs at a time, and the last one is kept until the next. */
export interface AssetJob {
    id: string;
    kind: 'sync' | 'publish';
    title: string;
    status: 'running' | 'done' | 'failed' | 'canceled';
    phase: string;
    total: number;
    done: number;
    failed: number;
    log: string[];
    error: string | null;
    /** What it came to. The spec leaves its shape open: a line, or a few named counts. */
    result: unknown;
    playerId: number | null;
    startedAt: string;
    finishedAt: string | null;
}

export interface AssetKindSummary {
    kind: BundleKind;
    bundles: number;
    failed: number;
    bytes: number;
}

export interface AssetsStatus {
    directory: string;
    canManage: boolean;
    kinds: AssetKindSummary[];
    job: AssetJob | null;
    checks: { errors: number; warnings: number };
    /** The publish targets; their shape here isn't fixed, so the panel reads them from `/assets/targets`. */
    targets: unknown;
}

export interface AssetBundle {
    kind: BundleKind;
    name: string;
    revision: string | number | null;
    source: 'habbo' | 'upload';
    hash: string | null;
    size: number;
    /** The ids that load it: the effects sharing an effect's library, a pet's type. */
    ids: number[];
    /** Why it has no file, when it has none. */
    error: string | null;
    updatedAt: string;
    /** Whether the hotel names it; an effect always is. */
    used: boolean;
}

export interface AssetBundleDetail extends AssetBundle {
    path: string;
    files: { name: string; size: number }[];
}

export interface AssetCheck {
    id: string;
    severity: 'error' | 'warning';
    title: string;
    detail: string;
    count: number;
    samples: string[];
    /** With `status`, the bundle list the check is about. */
    kind: BundleKind | null;
    status: BundleStatus | null;
}

export interface AssetPublishEntry {
    id: number;
    startedAt: string;
    finishedAt: string | null;
    playerId: number | null;
    playerName: string | null;
    dryRun: boolean;
    uploaded: number;
    skipped: number;
    deleted: number;
    bytes: number;
    error: string | null;
}

export interface AssetTarget {
    id: number;
    name: string;
    protocol: TargetProtocol;
    host: string;
    port: number;
    user: string;
    hasPassword: boolean;
    remotePath: string;
    publicUrl: string;
    allowSelfSigned: boolean;
    /** The SFTP host key trusted on first connection, once there has been one. */
    hostKey: string | null;
    /** How many bundles it lacks or holds an older copy of. */
    pending: number;
    lastPublish: AssetPublishEntry | null;
}

export interface AssetTargetInput {
    name: string;
    protocol: TargetProtocol;
    host: string;
    port: number;
    user: string;
    /** Null keeps the saved one; empty clears it. */
    password: string | null;
    remotePath: string;
    publicUrl: string;
    allowSelfSigned: boolean;
}

const JOB_KEY = [ 'asset-job' ];

const refresh = (queryClient: QueryClient) => void queryClient.invalidateQueries({ queryKey: [ 'assets' ] });

/** A job that has just started: polled from now on. */
const started = (queryClient: QueryClient, job: AssetJob) => {
    queryClient.setQueryData(JOB_KEY, job);
    refresh(queryClient);
};

export const useAssetsStatus = () => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: [ 'assets', 'status' ],
        queryFn: async () => {
            const status = await api<AssetsStatus>('/assets');
            const known = queryClient.getQueryData<AssetJob | null>(JOB_KEY);

            // A job started elsewhere (another staff member, the Habbo check's timer): polled from now on.
            if (status.job?.status === 'running' && known?.status !== 'running')
                queryClient.setQueryData(JOB_KEY, status.job);

            return status;
        },
    });
};

/**
 * The job running or last run, asked for every second while one runs and not otherwise. When it
 * ends, everything the page shows is asked for again.
 */
export const useAssetJob = () => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: JOB_KEY,
        queryFn: async () => {
            const before = queryClient.getQueryData<AssetJob | null>(JOB_KEY);
            const job = (await api<AssetJob | undefined>('/assets/job')) ?? null;

            if (before?.status === 'running' && job?.status !== 'running')
                refresh(queryClient);

            return job;
        },
        refetchInterval: query => (query.state.data?.status === 'running' ? 1000 : false),
    });
};

export const useStartSync = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => post<AssetJob>('/assets/sync'),
        onSuccess: job => started(queryClient, job),
    });
};

export const useCancelJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => post<void>('/assets/job/cancel'),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: JOB_KEY }),
    });
};

export const useAssetChecks = () => useQuery({
    queryKey: [ 'assets', 'checks' ],
    queryFn: () => api<{ items: AssetCheck[] }>('/assets/checks'),
});

export const useBundles = (kind: BundleKind, q: string, status: BundleStatus, page: number) => useQuery({
    queryKey: [ 'assets', 'bundles', kind, q, status, page ],
    queryFn: () => {
        const params = new URLSearchParams({ kind, q, status, page: String(page) });

        return api<{ items: AssetBundle[]; total: number; pageSize: number }>(`/assets/bundles?${params}`);
    },
    placeholderData: keepPreviousData,
});

const bundlePath = (kind: BundleKind, name: string) => `/assets/bundles/${kind}/${encodeURIComponent(name)}`;

export const useBundle = (bundle: { kind: BundleKind; name: string } | null) => useQuery({
    queryKey: [ 'assets', 'bundle', bundle?.kind, bundle?.name ],
    queryFn: () => api<AssetBundleDetail>(bundlePath(bundle!.kind, bundle!.name)),
    enabled: !!bundle,
});

export const useDeleteBundle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ kind, name }: { kind: BundleKind; name: string }) => remove<void>(bundlePath(kind, name)),
        onSuccess: () => refresh(queryClient),
    });
};

/** The auth header every call carries, for the calls `client.ts` can't make (files both ways). */
const authHeaders = () => {
    const token = useSession.getState().session?.token;
    const headers = new Headers();

    if (token)
        headers.set('Authorization', `Bearer ${token}`);

    return { token, headers };
};

/** A call the server refused, with its own words when it gave them, as `client.ts` reads them. */
const refusal = async (response: Response, token: string | undefined) => {
    if (response.status === 401 && token)
        useSession.getState().signOut();

    let message: string | null = null;

    try {
        const body = (await response.json()) as { message?: unknown; error?: unknown };

        message = typeof body.message === 'string' ? body.message : typeof body.error === 'string' ? body.error : null;
    } catch {
        // No body, or not JSON: the status speaks for it.
    }

    return new ApiError(response.status, message ?? `The server answered ${response.status}.`);
};

const send = async (path: string, init: RequestInit) => {
    const { token, headers } = authHeaders();

    let response: Response;

    try {
        response = await fetch(`${API_URL}/api${path}`, { ...init, headers });
    } catch {
        throw new ApiError(0, 'Cannot reach the admin API. Is the server running with Turbo:Admin:Enabled?');
    }

    if (!response.ok)
        throw await refusal(response, token);

    return response;
};

/** Sends a form with files as the signed-in player; the browser sets its boundary. */
const postForm = async <T>(path: string, form: FormData) => (await (await send(path, { method: 'POST', body: form })).json()) as T;

export const useUploadBundle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ file, kind, name }: { file: File; kind: BundleKind; name: string }) => {
            const form = new FormData();

            form.append('file', file);
            form.append('kind', kind);

            if (name.trim())
                form.append('name', name.trim());

            return postForm<AssetBundle>('/assets/bundles', form);
        },
        onSuccess: () => refresh(queryClient),
    });
};

/**
 * Saves a bundle's `.nitro` file. The file needs the session's header, which a plain link can't
 * carry, so it is fetched and handed to the browser as a download.
 */
export const downloadBundle = async (kind: BundleKind, name: string) => {
    const response = await send(`${bundlePath(kind, name)}/file`, {});
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');

    link.href = url;
    link.download = `${name}.nitro`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const useTargets = () => useQuery({
    queryKey: [ 'assets', 'targets' ],
    queryFn: () => api<{ items: AssetTarget[] }>('/assets/targets'),
});

export const useSaveTarget = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id: number | null; input: AssetTargetInput }) =>
            id === null ? post<AssetTarget>('/assets/targets', input) : put<AssetTarget>(`/assets/targets/${id}`, input),
        onSuccess: () => refresh(queryClient),
    });
};

export const useDeleteTarget = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => remove<void>(`/assets/targets/${id}`),
        onSuccess: () => refresh(queryClient),
    });
};

export const useTestTarget = () => useMutation({
    mutationFn: (id: number) => post<{ ok: boolean; message: string }>(`/assets/targets/${id}/test`),
});

export const usePublish = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, dryRun, deleteRemoved }: { id: number; dryRun: boolean; deleteRemoved: boolean }) =>
            post<AssetJob>(`/assets/targets/${id}/publish`, { dryRun, deleteRemoved }),
        onSuccess: job => started(queryClient, job),
    });
};

export const useForgetHostKey = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => post<void>(`/assets/targets/${id}/forget-host-key`),
        onSuccess: () => refresh(queryClient),
    });
};

export const useTargetHistory = (id: number | null) => useQuery({
    queryKey: [ 'assets', 'targets', id, 'history' ],
    queryFn: () => api<{ items: AssetPublishEntry[] }>(`/assets/targets/${id}/history`),
    enabled: id !== null,
});
