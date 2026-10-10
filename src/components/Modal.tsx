import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx } from '#/lib/cx';

import { useModalDialog } from './dialog';

/**
 * A wide dialog over the page, for picking from many or editing one thing at length: on a phone
 * it fills the screen, with its title and a close button along the top.
 */
export const Modal = ({ title, open, onClose, children, className }: { title: ReactNode; open: boolean; onClose: () => void; children: ReactNode; className?: string }) => {
    const dialog = useModalDialog(open, onClose);

    return (
        <dialog
            {...dialog}
            className={cx(
                'm-0 h-dvh max-h-none w-full max-w-none animate-rise border-line bg-surface p-0 text-ink sm:m-auto sm:h-auto sm:max-h-[85dvh] sm:max-w-3xl sm:rounded-2xl sm:border sm:shadow-2xl',
                className,
            )}
        >
            {open && (
                <div className="flex h-full max-h-[inherit] flex-col">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
                        <h2 className="min-w-0 truncate text-sm font-semibold">{title}</h2>
                        <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink sm:size-9">
                            <X className="size-4" />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">{children}</div>
                </div>
            )}
        </dialog>
    );
};
