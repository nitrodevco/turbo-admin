import { type MouseEvent, useEffect, useRef } from 'react';

/**
 * The browser's own modal dialog, opened and closed as `open` says: focus stays in it, Escape
 * closes it, and so does a click on the dim around it. What every dialog in the panel (a sheet, a
 * wide picker, a question) is built on. Spread the result on a `<dialog>`.
 */
export const useModalDialog = (open: boolean, onClose: () => void) => {
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

    return {
        ref,
        onClose,
        onClick: (event: MouseEvent<HTMLDialogElement>) => {
            if (event.target === ref.current)
                onClose();
        },
    };
};
