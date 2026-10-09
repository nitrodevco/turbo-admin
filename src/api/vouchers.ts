import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post, put } from './client';

/** A voucher: a code players redeem once in the catalogue, and what it gives. */
export interface Voucher {
    id: number;
    code: string;
    credits: number;
    /** A `currency_types` row it gives `currencyAmount` of. */
    currencyTypeId: number | null;
    currencyAmount: number;
    furnitureDefinitionId: number | null;
    furnitureQuantity: number;
    badgeCode: string | null;
    /** Redemptions it allows in all; null for any number. */
    maxUses: number | null;
    uses: number;
    /** UTC; null for never. */
    expiresAt: string | null;
    enabled: boolean;
    note: string;
    createdAt: string;
}

export interface VoucherItem {
    voucher: Voucher;
    furnitureName: string | null;
}

export type VoucherDraft = Omit<Voucher, 'id' | 'uses' | 'createdAt'>;

export interface VoucherRedemption {
    playerId: number;
    playerName: string;
    redeemedAt: string;
}

const useRefresh = () => {
    const queryClient = useQueryClient();

    return () => void queryClient.invalidateQueries({ queryKey: [ 'vouchers' ] });
};

export const useVouchers = (text: string, page: number) => useQuery({
    queryKey: [ 'vouchers', text, page ],
    queryFn: () => api<{ vouchers: VoucherItem[]; total: number; pageSize: number; canManage: boolean }>(`/vouchers?${new URLSearchParams({ q: text, page: String(page) })}`),
    placeholderData: keepPreviousData,
});

export const useVoucherRedemptions = (id: number | null) => useQuery({
    queryKey: [ 'vouchers', 'redemptions', id ],
    queryFn: () => api<{ redemptions: VoucherRedemption[] }>(`/vouchers/${id}/redemptions`),
    enabled: id !== null,
});

/** Adds a voucher (no id) or changes one. */
export const useSaveVoucher = () => {
    const refresh = useRefresh();

    return useMutation({
        mutationFn: ({ id, ...voucher }: VoucherDraft & { id: number | null }) => (id === null
            ? post<VoucherItem>('/vouchers', voucher)
            : put<VoucherItem>(`/vouchers/${id}`, voucher)),
        onSuccess: refresh,
    });
};

/** Makes many vouchers like one, each its own random code after the prefix. */
export const useGenerateVouchers = () => {
    const refresh = useRefresh();

    return useMutation({
        mutationFn: (request: { count: number; prefix: string; voucher: VoucherDraft }) => post<{ vouchers: VoucherItem[] }>('/vouchers/generate', request),
        onSuccess: refresh,
    });
};

export const useDeleteVoucher = () => {
    const refresh = useRefresh();

    return useMutation({
        mutationFn: (id: number) => api<void>(`/vouchers/${id}`, { method: 'DELETE' }),
        onSuccess: refresh,
    });
};
