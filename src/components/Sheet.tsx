import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '#/lib/cx';

import { useModalDialog } from './dialog';

/**
 * A short list of choices that rises from the bottom of a phone's screen (and opens in the middle
 * of a bigger one): the actions on one player, the rest of the menu. The browser's own modal
 * dialog, so focus stays in it and Escape closes it; a tap outside it closes it too.
 */
export const Sheet = ({ title, open, onClose, children }: { title: ReactNode; open: boolean; onClose: () => void; children: ReactNode }) => {
    const dialog = useModalDialog(open, onClose);

    return (
        <dialog
            {...dialog}
            className="mx-0 mt-auto mb-0 w-full max-w-none animate-sheet rounded-t-2xl border border-line bg-surface p-0 text-ink sm:m-auto sm:max-w-sm sm:animate-rise sm:rounded-2xl sm:shadow-2xl"
        >
            <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />
            <div className="px-5 pt-3 pb-1 text-sm font-semibold">{title}</div>
            <div className="flex flex-col px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{children}</div>
        </dialog>
    );
};

/** One choice in a sheet: a full-width row a thumb can hit. */
export const SheetItem = ({ icon, tone, className, children, ...button }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode; tone?: 'bad' }) => (
    <button
        type="button"
        {...button}
        className={cx(
            'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors hover:bg-subtle disabled:opacity-50 [&>svg]:size-5 [&>svg]:shrink-0',
            tone === 'bad' ? 'text-bad' : 'text-ink',
            className,
        )}
    >
        {icon}
        {children}
    </button>
);
