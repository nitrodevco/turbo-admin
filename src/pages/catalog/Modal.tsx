import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

import { cx } from '#/lib/cx';

/**
 * A wide dialog over the editor, for picking from many: the browser's own modal, so focus stays in
 * it and Escape closes it; a click outside it closes it too. On a phone it fills the screen.
 */
export const Modal = ({ title, open, onClose, children, className }: { title: ReactNode; open: boolean; onClose: () => void; children: ReactNode; className?: string }) => {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;

        if (!dialog)
            return;

        if (open && !dialog.open)
            dialog.showModal();
        else if (!open && dialog.open)
            dialog.close();
    }, [ open ]);

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(event) => {
                if (event.target === ref.current)
                    onClose();
            }}
            className={cx(
                'm-0 h-dvh max-h-none w-full max-w-none animate-rise border-line bg-surface p-0 text-ink backdrop:bg-black/40 sm:m-auto sm:h-auto sm:max-h-[85dvh] sm:max-w-3xl sm:rounded-2xl sm:border',
                className,
            )}
        >
            {open && (
                <div className="flex h-full max-h-[inherit] flex-col">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                        <h2 className="text-sm font-semibold">{title}</h2>
                        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink">
                            <X className="size-4" />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                </div>
            )}
        </dialog>
    );
};
