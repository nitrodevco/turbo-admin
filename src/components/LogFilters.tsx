import { SlidersHorizontal } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import { cx } from '#/lib/cx';

import { Badge, Button } from './ui';

/**
 * A log's less used filters and its search button. From a tablet up they sit in the toolbar's row;
 * on a phone they fold away behind a Filters button that counts the ones in use, so the list starts
 * higher, and open as a column of full-width fields. The Chat log's toolbar uses it too, so the two
 * read alike.
 */
export const LogFilters = ({ active, children }: { active: number; children: ReactNode }) => {
    const [ open, setOpen ] = useState(false);
    const id = useId();

    return (
        <>
            <Button
                variant="secondary"
                icon={<SlidersHorizontal />}
                aria-expanded={open}
                aria-controls={id}
                onClick={() => setOpen(!open)}
                className="sm:hidden"
            >
                Filters
                {active > 0 && <Badge tone="accent">{active}</Badge>}
            </Button>
            <div id={id} className={cx('flex basis-full flex-col gap-2 max-sm:[&>*]:w-full sm:contents', !open && 'max-sm:hidden')}>
                {children}
            </div>
        </>
    );
};
