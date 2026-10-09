import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post, put } from './client';
import type { ChangeSet, VariableEntry } from './gamedata';

export interface HotelViewResponse {
    /** Every `landing.view.*` variable, by key, each value as JSON. */
    variables: VariableEntry[];
    canManage: boolean;
}

export interface HotelViewText {
    key: string;
    value: string;
}

/** Changes saved as one: variables to a JSON value or null to remove; texts to a value or null to remove. */
export interface HotelViewSave {
    variables: Record<string, string | null>;
    texts: Record<string, string | null>;
}

export const useHotelView = () => useQuery({
    queryKey: [ 'gamedata', 'hotel-view' ],
    queryFn: () => api<HotelViewResponse>('/gamedata/hotel-view'),
});

/** The hotel's texts of these keys; a key it has no text for is left out. */
export const useHotelViewTexts = (keys: string[]) => useQuery({
    queryKey: [ 'gamedata', 'hotel-view', 'texts', keys ],
    queryFn: () => post<{ texts: HotelViewText[] }>('/gamedata/hotel-view/texts', { keys }),
    placeholderData: keepPreviousData,
});

/** Saves the hotel view's variables and texts as one change set, which rolls back as one. */
export const useSaveHotelView = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (save: HotelViewSave) => put<{ changeSet: ChangeSet | null }>('/gamedata/hotel-view', save),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [ 'gamedata' ] });
            // The panel's pictures are read from the variables too.
            void queryClient.invalidateQueries({ queryKey: [ 'client-assets' ] });
        },
    });
};

/** Where an article's button goes: PromoArticleLinkType. */
export const ARTICLE_LINK_TYPES: Record<number, string> = { 0: 'Web page', 1: 'Client link', 2: 'No button' };

export interface PromoArticle {
    id: number;
    title: string;
    bodyText: string;
    buttonText: string;
    linkType: number;
    linkContent: string;
    /** The picture's path under the client's image library. */
    imageUrl: string;
    sortOrder: number;
    visible: boolean;
    /** UTC; null for at once. */
    startsAt: string | null;
    /** UTC; null for never. */
    endsAt: string | null;
}

export type PromoArticleDraft = Omit<PromoArticle, 'id' | 'sortOrder'>;

const useRefreshReception = () => {
    const queryClient = useQueryClient();

    return () => void queryClient.invalidateQueries({ queryKey: [ 'hotel-view' ] });
};

export const usePromoArticles = () => useQuery({
    queryKey: [ 'hotel-view', 'articles' ],
    queryFn: () => api<{ articles: PromoArticle[] }>('/hotel-view/articles'),
});

/** Adds an article (no id) at the end, or changes one. */
export const useSavePromoArticle = () => {
    const refresh = useRefreshReception();

    return useMutation({
        mutationFn: ({ id, ...article }: PromoArticleDraft & { id: number | null }) => (id === null
            ? post<PromoArticle>('/hotel-view/articles', article)
            : put<PromoArticle>(`/hotel-view/articles/${id}`, article)),
        onSuccess: refresh,
    });
};

export const useDeletePromoArticle = () => {
    const refresh = useRefreshReception();

    return useMutation({
        mutationFn: (id: number) => api<void>(`/hotel-view/articles/${id}`, { method: 'DELETE' }),
        onSuccess: refresh,
    });
};

export const useReorderPromoArticles = () => {
    const refresh = useRefreshReception();

    return useMutation({
        mutationFn: (ids: number[]) => put<void>('/hotel-view/articles/order', { ids }),
        onSuccess: refresh,
    });
};

/** How a community goal is played: CommunityGoalMode. */
export const GOAL_MODES: Record<number, string> = { 0: 'One meter', 1: 'Two sides', 2: 'Two sides, with a vote' };

export interface CommunityGoal {
    id: number;
    code: string;
    mode: number;
    /** UTC. */
    startsAt: string;
    /** UTC. */
    endsAt: string;
    levelScores: number[];
    rewardRanks: number[];
    sideOnePageId: number | null;
    sideTwoPageId: number | null;
}

export interface GoalContributor {
    playerId: number;
    name: string;
    figure: string;
    rank: number;
    score: number;
}

export interface GoalStanding {
    goalId: number;
    sideOne: number;
    sideTwo: number;
    contributors: number;
    votesOne: number;
    votesTwo: number;
    top: GoalContributor[];
}

export const useCommunityGoals = () => useQuery({
    queryKey: [ 'hotel-view', 'goals' ],
    queryFn: () => api<{ goals: CommunityGoal[] }>('/hotel-view/goals'),
});

export const useGoalStanding = (id: number | null) => useQuery({
    queryKey: [ 'hotel-view', 'goals', id, 'standing' ],
    queryFn: () => api<GoalStanding>(`/hotel-view/goals/${id}/standing`),
    enabled: id !== null,
    refetchInterval: 30_000,
});

/** Adds a goal (no id) or changes one. */
export const useSaveCommunityGoal = () => {
    const refresh = useRefreshReception();

    return useMutation({
        mutationFn: ({ id, ...goal }: Omit<CommunityGoal, 'id'> & { id: number | null }) => (id === null
            ? post<CommunityGoal>('/hotel-view/goals', goal)
            : put<CommunityGoal>(`/hotel-view/goals/${id}`, goal)),
        onSuccess: refresh,
    });
};

export const useDeleteCommunityGoal = () => {
    const refresh = useRefreshReception();

    return useMutation({
        mutationFn: (id: number) => api<void>(`/hotel-view/goals/${id}`, { method: 'DELETE' }),
        onSuccess: refresh,
    });
};
