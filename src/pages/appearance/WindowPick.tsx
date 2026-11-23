import type { ReactNode } from 'react';

import { cx } from '#/lib/cx';

/**
 * A window in a list to pick from (Windows & skins, Texts): what staff call it over its file's id,
 * the one picked marked as the studio's list marks it, with `tag` after the name.
 */
export const WindowPick = ({ name, id, picked, onPick, tag }: { name: string; id: string; picked: boolean; onPick: () => void; tag?: ReactNode }) => (
    <button
        type="button"
        aria-current={picked ? 'true' : undefined}
        title={id}
        onClick={onPick}
        className={cx('flex w-full min-w-0 flex-col px-4 py-1.5 text-left hover:bg-subtle', picked && 'bg-subtle')}
    >
        <span className={cx('flex min-w-0 items-center gap-2 text-ui', picked && 'text-accent')}>
            <span className="truncate">{name}</span>
            {tag}
        </span>
        <span className="truncate font-mono text-2xs text-muted">{id}</span>
    </button>
);
