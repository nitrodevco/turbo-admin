import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { cx } from '#/lib/cx';

import { useToasts } from './feedback';

/**
 * The notes, bottom centre, above everything; a tap dismisses one. They sit in the browser's top
 * layer, shown again on each new note so they stay over an open dialog (an offer, a picker).
 */
export const Toasts = () => {
    const { toasts, dismiss } = useToasts();
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = box.current;

        if (!element?.showPopover)
            return;

        if (element.matches(':popover-open'))
            element.hidePopover();

        if (toasts.length > 0)
            element.showPopover();
    }, [ toasts ]);

    return (
        <div
            ref={box}
            popover="manual"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 top-auto bottom-[calc(1rem+env(safe-area-inset-bottom))] m-0 flex h-auto w-full flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-0 px-4 [&:not(:popover-open)]:hidden"
        >
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
