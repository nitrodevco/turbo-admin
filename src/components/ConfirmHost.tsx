import { AlertTriangle, HelpCircle } from 'lucide-react';

import { cx } from '#/lib/cx';

import { useAsking } from './confirm';
import { useModalDialog } from './dialog';
import { Button } from './ui';

/**
 * Where a question is asked, mounted once in the shell: a sheet from the bottom of a phone, a card
 * in the middle of a bigger screen. Enter goes ahead, Escape or a tap outside turns it down.
 */
export const ConfirmHost = () => {
    const asking = useAsking(state => state.asking);
    const dialog = useModalDialog(!!asking, () => asking?.answer(false));

    return (
        <dialog
            {...dialog}
            aria-labelledby="confirm-title"
            className="mx-0 mt-auto mb-0 w-full max-w-none animate-sheet rounded-t-2xl border border-line bg-surface p-0 text-ink shadow-2xl sm:m-auto sm:max-w-md sm:animate-rise sm:rounded-2xl"
        >
            {asking && (
                <form
                    method="dialog"
                    onSubmit={(event) => {
                        event.preventDefault();
                        asking.answer(true);
                    }}
                    className="flex flex-col gap-4 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pt-5"
                >
                    <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
                    <div className="flex items-start gap-3.5">
                        <span className={cx('grid size-10 shrink-0 place-items-center rounded-full [&>svg]:size-5', asking.danger ? 'bg-bad-soft text-bad' : 'bg-accent-soft text-accent')}>
                            {asking.danger ? <AlertTriangle /> : <HelpCircle />}
                        </span>
                        <div className="min-w-0 pt-1.5">
                            <h2 id="confirm-title" className="text-[15px] font-semibold text-pretty">{asking.title}</h2>
                            {asking.body && <p className="mt-1.5 text-sm text-pretty text-muted">{asking.body}</p>}
                        </div>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="secondary" onClick={() => asking.answer(false)}>Cancel</Button>
                        {/* Focused first, as window.confirm had it: Enter goes ahead. */}
                        <Button type="submit" autoFocus variant={asking.danger ? 'danger' : 'primary'}>{asking.confirm}</Button>
                    </div>
                </form>
            )}
        </dialog>
    );
};
