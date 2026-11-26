import { useQueryClient } from '@tanstack/react-query';
import { Eye, X } from 'lucide-react';
import { useEffect } from 'react';

import { useEndPreview } from '#/api/preview';
import { useMe } from '#/api/queries';
import { toastError } from '#/components/toast';
import { Button } from '#/components/ui';
import { formatClock, isoTime } from '#/lib/time';

/**
 * The strip across the top of every page while the staff member views the panel and the hotel as
 * a group: which group, until when, and the way back. The server lets the request that stops it
 * through whatever the group may do, so it works even from a group that may not open the panel.
 */
export const PreviewBanner = () => {
    const { data: me } = useMe();
    const end = useEndPreview();
    const queryClient = useQueryClient();
    const preview = me?.preview;
    const endsAt = isoTime(preview?.endsAtUtc ?? null);

    // It ends by itself on the server; ask again then, so the panel is theirs once more.
    useEffect(() => {
        if (endsAt === null)
            return;

        const timer = window.setTimeout(() => void queryClient.invalidateQueries(), Math.max(0, endsAt - Date.now()) + 1_000);

        return () => window.clearTimeout(timer);
    }, [ endsAt, queryClient ]);

    if (!preview || endsAt === null)
        return null;

    return (
        <div role="status" className="z-40 border-b border-warn-line bg-warn-soft lg:sticky lg:top-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
                <Eye className="size-4 shrink-0 text-warn" aria-hidden />
                <p className="min-w-0 flex-[1_1_16rem] text-sm text-ink">
                    Viewing as <strong className="font-semibold">{preview.displayName}</strong>
                    <span className="text-muted">
                        {' '}until {formatClock(endsAt)}: the panel and the hotel show you only what its members get.
                    </span>
                </p>
                <Button small variant="secondary" icon={<X />} disabled={end.isPending} onClick={() => end.mutate(undefined, { onError: toastError })}>
                    Stop viewing
                </Button>
            </div>
        </div>
    );
};
