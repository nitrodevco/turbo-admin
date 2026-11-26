import { toast, toastError } from '#/components/toast';

/**
 * Puts text on the clipboard, and says so in a toast when `note` is given: true once it is there.
 * Where the browser refuses (the panel opened over plain http, where there is no clipboard, or the
 * permission was turned down) a toast says to copy it by hand, and it gives false.
 */
export const copyText = async (text: string, note?: string) => {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        toastError(new Error('The browser wouldn\'t copy it: select it and press Ctrl+C.'));

        return false;
    }

    if (note)
        toast(note);

    return true;
};
