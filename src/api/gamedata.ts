import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post, put } from './client';

/** Floor (0) or wall (1), as the server's ProductType numbers them. */
export const FURNITURE_KINDS: Record<number, string> = { 0: 'floor', 1: 'wall' };

/** What made a change set: GamedataChangeKind. */
export const CHANGE_KINDS: Record<number, string> = { 0: 'import', 1: 'edit', 2: 'rollback', 3: 'habbo values' };

/** What an import does to one of Habbo's items: FurnitureImportAction. */
export const IMPORT_ACTIONS: Record<number, string> = { 0: 'add', 1: 'update', 2: 'keep' };

/** Which table a change touched: GamedataRecordType. */
export const RECORD_TYPES: Record<number, string> = { 0: 'definition', 1: 'Habbo item' };

export interface HabboRelease {
    id: number;
    domain: string;
    revision: string;
    furnitureDataHash: string;
    furnitureCount: number;
    foundAt: string;
    checkedAt: string;
    /** Null until its furniture is taken in. */
    importedAt: string | null;
}

export interface GamedataFile {
    file: string;
    hash: string;
    size: number;
    builtAt: string;
}

export interface GamedataStatus {
    latestRelease: HabboRelease | null;
    furnitureData: GamedataFile;
    canManage: boolean;
}

export interface FurnitureFieldChange {
    field: string;
    /** The hotel's value, as JSON. */
    current: string;
    /** Habbo's new value, as JSON. */
    incoming: string;
    /** The hotel changed it itself, so it keeps its value. */
    kept: boolean;
}

export interface FurnitureImportItem {
    productType: number;
    className: string;
    spriteId: number;
    definitionId: number | null;
    action: number;
    fields: FurnitureFieldChange[];
}

export interface FurnitureImportPreview {
    release: HabboRelease;
    added: number;
    updated: number;
    kept: number;
    unchanged: number;
    items: FurnitureImportItem[];
    truncated: boolean;
    /** Furniture asset files taking it in reads first. */
    filesToRead: number;
}

/** Where taking in a release is: GamedataImportPhase. */
export const IMPORT_PHASES: Record<number, string> = { 0: 'reading furniture files', 1: 'writing definitions', 2: 'done', 3: 'failed' };

export interface ImportJob {
    releaseId: number;
    revision: string;
    phase: number;
    filesTotal: number;
    filesDone: number;
    filesFailed: number;
    changeSet: ChangeSet | null;
    error: string | null;
    startedAt: string;
    finishedAt: string | null;
}

export interface ChangeSet {
    id: number;
    kind: number;
    summary: string;
    playerId: number | null;
    releaseId: number | null;
    revertsId: number | null;
    rolledBackById: number | null;
    changeCount: number;
    createdAt: string;
}

export interface Change {
    recordType: number;
    recordId: number;
    label: string;
    /** The fields before, as a JSON object; null for a row the set made. */
    before: string | null;
    after: string | null;
}

export interface RollbackResult {
    changeSet: ChangeSet;
    skipped: string[];
}

export interface FurnitureSearchItem {
    id: number;
    name: string;
    spriteId: number;
    type: string;
}

export interface FurnitureDefinition {
    id: number;
    productType: number;
    className: string;
    /** The item as the built FurnitureData writes it, as JSON. */
    item: string;
    /** Habbo's item in its newest release, as JSON; null for the hotel's own furniture. */
    habbo: string | null;
    /** What Habbo's asset file said, as JSON, or why it could not be read; null when not read. */
    habboFile: string | null;
    habboFileRead: boolean;
    /** Its total_states, which furnidata does not carry. */
    states: number;
}

export const useGamedataStatus = () => useQuery({
    queryKey: [ 'gamedata' ],
    queryFn: () => api<GamedataStatus>('/gamedata'),
});

/** Everything gamedata shows, asked again after a change. */
const useRefresh = () => {
    const queryClient = useQueryClient();

    return () => void queryClient.invalidateQueries({ queryKey: [ 'gamedata' ] });
};

export const useCheckHabbo = () => {
    const refresh = useRefresh();

    return useMutation({
        mutationFn: () => post<{ release: HabboRelease; isNew: boolean }>('/gamedata/habbo/check'),
        onSuccess: refresh,
    });
};

export const useImportPreview = (enabled: boolean) => useQuery({
    queryKey: [ 'gamedata', 'import' ],
    queryFn: () => api<FurnitureImportPreview>('/gamedata/habbo/import'),
    enabled,
});

/** Starts taking a release in, in the background. */
export const useImport = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (releaseId: number) => post<{ job: ImportJob }>(`/gamedata/habbo/import/${releaseId}`),
        onSuccess: data => queryClient.setQueryData([ 'gamedata-import-job' ], data),
    });
};

/** The import running or run last, asked again each second while it runs. */
export const useImportJob = () => {
    const refresh = useRefresh();

    return useQuery({
        queryKey: [ 'gamedata-import-job' ],
        queryFn: async () => {
            const data = await api<{ job: ImportJob | null }>('/gamedata/habbo/import/job');

            if (data.job && data.job.phase >= 2)
                refresh();

            return data;
        },
        refetchInterval: query => (query.state.data?.job && query.state.data.job.phase < 2 ? 1000 : false),
    });
};

export const useRebuild = () => {
    const refresh = useRefresh();

    return useMutation({
        mutationFn: () => post<GamedataFile>('/gamedata/files/furnidata/build'),
        onSuccess: refresh,
    });
};

export const useFurnitureSearch = (text: string) => useQuery({
    queryKey: [ 'gamedata', 'furniture', 'search', text ],
    queryFn: () => api<FurnitureSearchItem[]>(`/gamedata/furniture?${new URLSearchParams({ q: text })}`),
    enabled: text.trim().length > 0,
    placeholderData: keepPreviousData,
});

export const useFurnitureDefinition = (id: number | null) => useQuery({
    queryKey: [ 'gamedata', 'furniture', id ],
    queryFn: () => api<FurnitureDefinition>(`/gamedata/furniture/${id}`),
    enabled: id !== null,
});

export const useUpdateDefinition = (id: number) => {
    const refresh = useRefresh();

    return useMutation({
        mutationFn: (fields: Record<string, unknown>) => put<FurnitureDefinition>(`/gamedata/furniture/${id}`, { fields }),
        onSuccess: refresh,
    });
};

export interface HabboValuesPreview {
    /** Definitions whose value is not Habbo's, by furnidata key. */
    byField: Record<string, number>;
    /** Definitions with at least one such field. */
    definitions: number;
    /** The release Habbo's values come from; null before Habbo was checked. */
    release: HabboRelease | null;
}

/** How many definitions differ from Habbo in these fields. */
export const useHabboValuesPreview = (fields: string[]) => useQuery({
    queryKey: [ 'gamedata', 'habbo-values', fields ],
    queryFn: () => api<HabboValuesPreview>(`/gamedata/furniture/habbo-values?${new URLSearchParams({ fields: fields.join(',') })}`),
    enabled: fields.length > 0,
    placeholderData: keepPreviousData,
});

/** Puts Habbo's values back in these fields, over the hotel's, for all of Habbo's furniture. */
export const useTakeHabboValues = () => {
    const refresh = useRefresh();

    return useMutation({
        mutationFn: (fields: string[]) => post<{ changeSet: ChangeSet | null }>('/gamedata/furniture/habbo-values', { fields }),
        onSuccess: refresh,
    });
};

export const useHistory = (page: number) => useQuery({
    queryKey: [ 'gamedata', 'history', page ],
    queryFn: () => api<ChangeSet[]>(`/gamedata/history?page=${page}`),
    placeholderData: keepPreviousData,
});

export const useChanges = (id: number | null) => useQuery({
    queryKey: [ 'gamedata', 'history', 'changes', id ],
    queryFn: () => api<Change[]>(`/gamedata/history/${id}`),
    enabled: id !== null,
});

export const useRollback = () => {
    const refresh = useRefresh();

    return useMutation({
        mutationFn: (id: number) => post<RollbackResult>(`/gamedata/history/${id}/rollback`),
        onSuccess: refresh,
    });
};
