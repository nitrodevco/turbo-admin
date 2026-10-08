import { CheckCircle2, XCircle } from 'lucide-react';

import { cx } from '#/lib/cx';

import { useToasts } from './feedback';

/** The notes, bottom centre, above everything; a tap dismisses one. */
export const Toasts = () => {
    const { toasts, dismiss } = useToasts();

    return (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4">
            {toasts.map(x => (
                <button
                    key={x.id}
                    type="button"
                    onClick={() => dismiss(x.id)}
                    className={cx(
                        'pointer-events-auto flex max-w-md animate-rise items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm shadow-lg [&>svg]:size-4 [&>svg]:shrink-0',
                        x.tone === 'good' ? 'border-good-line bg-good-soft text-good' : 'border-bad-line bg-bad-soft text-bad',
                    )}
                >
                    {x.tone === 'good' ? <CheckCircle2 /> : <XCircle />}
                    <span className="text-ink">{x.text}</span>
                </button>
            ))}
        </div>
    );
};
