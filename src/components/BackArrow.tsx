import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { cx } from '#/lib/cx';

/**
 * Whether the last header drawn had a back arrow. Each page draws its own header, so this is how
 * the next one knows whether its arrow is arriving (slide it in) or leaving (slide it out).
 */
let lastHadBack = false;

const arrowClass = 'grid size-7 shrink-0 place-items-center overflow-hidden rounded-md text-muted [&>svg]:size-4 [&>svg]:shrink-0';

/**
 * The page header's back arrow. Arriving, it opens from nothing and pushes the page's icon over;
 * leaving, it closes up again and the icon slides back. A page that keeps its arrow, or never has
 * one, draws it without moving.
 */
export const BackArrow = ({ back }: { back?: { to: string; label: string } }) => {
    const hasBack = back !== undefined;
    const [ entering ] = useState(() => hasBack && !lastHadBack);
    const [ leaving, setLeaving ] = useState(() => !hasBack && lastHadBack);
    const previous = useRef(hasBack);

    useEffect(() => {
        // The arrow went away on this same page: close it up from where it was.
        if (previous.current && !hasBack)
            setLeaving(true);

        previous.current = hasBack;
        lastHadBack = hasBack;
    }, [ hasBack ]);

    if (back)
        return (
            <Link
                to={back.to}
                title={`Back to ${back.label}`}
                aria-label={`Back to ${back.label}`}
                className={cx(arrowClass, 'transition-colors hover:bg-subtle hover:text-ink', entering && 'animate-back-in')}
            >
                <ArrowLeft />
            </Link>
        );

    if (leaving)
        return (
            <span aria-hidden className={cx(arrowClass, 'pointer-events-none animate-back-out')} onAnimationEnd={() => setLeaving(false)}>
                <ArrowLeft />
            </span>
        );

    return null;
};
