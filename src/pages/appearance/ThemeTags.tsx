import { Star, Users } from 'lucide-react';

import type { ThemeStatus } from '#/api/appearance';
import { Badge } from '#/components/ui';
import { cx } from '#/lib/cx';

import { NOBODY, STATUS_LABEL, STATUS_TONE } from './themes';

/** Whether players get a theme: Live, In development or Off, a dot before the word. */
export const StatusPill = ({ status }: { status: ThemeStatus }) => (
    <Badge tone={STATUS_TONE[status]}>
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        {STATUS_LABEL[status]}
    </Badge>
);

/** The hotel's default theme's tag. */
export const DefaultTag = () => <Badge tone="accent"><Star aria-hidden className="size-3" />default</Badge>;

/** Who draws a theme, in the few words `reachOf` says, muted when that is no one; `title` the whole list when it is cut. */
export const ReachLine = ({ words, title }: { words: string; title?: string }) => (
    <span className="flex min-w-0 items-center gap-1.5 text-ui" title={title}>
        <Users aria-hidden className="size-3.5 shrink-0 text-muted" />
        <span className={cx('truncate', NOBODY.has(words) && 'text-muted')}>{words}</span>
    </span>
);
