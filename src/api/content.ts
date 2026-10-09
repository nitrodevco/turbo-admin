import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post, put } from './client';

/** AchievementState, as the catalog numbers it. */
export const ACHIEVEMENT_STATES: Record<number, string> = { 0: 'Disabled', 1: 'Enabled', 2: 'Retired', 3: 'Off season', 4: 'Wired controlled' };

/** BadgeRarityType, as the badge directory numbers it. */
export const BADGE_RARITIES: Record<number, string> = { 0: 'Common', 1: 'Uncommon', 2: 'Rare', 3: 'Epic', 4: 'Mythical', 5: 'Legendary', 6: 'Unique' };

export interface AchievementItem {
    id: number;
    key: string;
    revision: number;
    category: string;
    subCategory: string;
    order: number;
    state: number;
    source: string;
    levels: number;
    firstBadge: string | null;
    lastBadge: string | null;
}

/** An achievement definition as the catalog keeps it: its own field names, in PascalCase. */
export interface AchievementDefinition {
    Id: number;
    Key: string;
    Revision: number;
    Category: string;
    SubCategory: string;
    Order: number;
    DisplayMethod: number;
    Source: string;
    SourceVersion: number;
    Reducer: number;
    UnitDivisor: number;
    Levels: AchievementLevel[];
    State: number;
    ActiveFromUtc: string | null;
    ActiveUntilUtc: string | null;
    Match: unknown;
    [field: string]: unknown;
}

export interface AchievementLevel {
    Requirement: number;
    BadgeCode: string;
    Score: number;
    Rewards: AchievementReward[];
}

export interface AchievementReward {
    Handler: string;
    Version: number;
    Currency: unknown;
    Amount: number;
    Payload: string;
}

export interface BadgeItem {
    code: string;
    holders: number;
    /** Pinned rarity; null when it is counted from how many hold it. */
    rarity: number | null;
}

export interface BadgeHolder {
    playerId: number;
    name: string;
    slot: number | null;
}

const useRefreshContent = () => {
    const queryClient = useQueryClient();

    return () => void queryClient.invalidateQueries({ queryKey: [ 'content' ] });
};

export const useAchievements = () => useQuery({
    queryKey: [ 'content', 'achievements' ],
    queryFn: () => api<{ achievements: AchievementItem[]; canManage: boolean }>('/content/achievements'),
});

export const useAchievementDefinition = (id: number | null) => useQuery({
    queryKey: [ 'content', 'achievements', id ],
    queryFn: () => api<{ definitionJson: string }>(`/content/achievements/${id}`),
    enabled: id !== null,
});

/** Checks a definition as publishing it would; saves nothing. */
export const useCheckAchievement = () => useMutation({
    mutationFn: (definitionJson: string) => post<{ revision: number }>('/content/achievements/check', { definitionJson }),
});

/** Publishes a definition as its achievement's next revision, on record with why. */
export const usePublishAchievement = () => {
    const refresh = useRefreshContent();

    return useMutation({
        mutationFn: ({ id, definitionJson, reason }: { id: number; definitionJson: string; reason: string }) => put<{ revision: number }>(`/content/achievements/${id}`, { definitionJson, reason }),
        onSuccess: refresh,
    });
};

export const useBadges = (text: string) => useQuery({
    queryKey: [ 'content', 'badges', text ],
    queryFn: () => api<{ badges: BadgeItem[] }>(`/content/badges?${new URLSearchParams({ q: text })}`),
    placeholderData: previous => previous,
});

export const useBadgeHolders = (code: string | null) => useQuery({
    queryKey: [ 'content', 'badges', code, 'holders' ],
    queryFn: () => api<{ holders: BadgeHolder[] }>(`/content/badges/${encodeURIComponent(code ?? '')}/holders`),
    enabled: code !== null,
});

export const useSetBadgeRarity = () => {
    const refresh = useRefreshContent();

    return useMutation({
        mutationFn: ({ code, rarity }: { code: string; rarity: number | null }) => put<void>(`/content/badges/${encodeURIComponent(code)}/rarity`, { rarity }),
        onSuccess: refresh,
    });
};

export const useGiveBadge = () => {
    const refresh = useRefreshContent();

    return useMutation({
        mutationFn: ({ code, playerId }: { code: string; playerId: number }) => post<void>(`/content/badges/${encodeURIComponent(code)}/holders`, { playerId }),
        onSuccess: refresh,
    });
};

export const useTakeBadge = () => {
    const refresh = useRefreshContent();

    return useMutation({
        mutationFn: ({ code, playerId }: { code: string; playerId: number }) => api<void>(`/content/badges/${encodeURIComponent(code)}/holders/${playerId}`, { method: 'DELETE' }),
        onSuccess: refresh,
    });
};

/** A text of the external texts, saved on its own as a change set of the gamedata. */
export const useSaveText = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (text: { key: string; value: string }) => put<unknown>('/gamedata/texts', text),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ 'gamedata' ] }),
    });
};

export interface NavigatorFlatCategory {
    id: number;
    name: string;
    visible: boolean;
    staffOnly: boolean;
    minRank: number;
    requiredNode: string | null;
    orderNum: number;
    automatic: boolean;
    automaticCategory: string | null;
    globalCategory: string | null;
    rooms: number;
}

export interface NavigatorEventCategory {
    id: number;
    name: string;
    visible: boolean;
    events: number;
}

export interface NavigatorTab {
    id: number;
    searchCode: string;
    visible: boolean;
    orderNum: number;
}

export interface NavigatorContent {
    flatCategories: NavigatorFlatCategory[];
    eventCategories: NavigatorEventCategory[];
    contexts: NavigatorTab[];
}

/** Which of the navigator's lists an edit is to: room categories, event categories or tabs. */
export type NavigatorList = 'categories' | 'event-categories' | 'tabs';

export const useNavigatorContent = () => useQuery({
    queryKey: [ 'content', 'navigator' ],
    queryFn: () => api<NavigatorContent>('/content/navigator'),
});

/** Adds (no id) or changes a row of one of the navigator's lists; a field left out keeps what it was. */
export const useSaveNavigator = () => {
    const refresh = useRefreshContent();

    return useMutation({
        mutationFn: ({ list, id, body }: { list: NavigatorList; id: number | null; body: Record<string, unknown> }) => (id === null
            ? post<{ id: number }>(`/content/navigator/${list}`, body)
            : put<{ id: number }>(`/content/navigator/${list}/${id}`, body)),
        onSuccess: refresh,
    });
};

export const useDeleteNavigator = () => {
    const refresh = useRefreshContent();

    return useMutation({
        mutationFn: ({ list, id }: { list: NavigatorList; id: number }) => api<void>(`/content/navigator/${list}/${id}`, { method: 'DELETE' }),
        onSuccess: refresh,
    });
};
