import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cx } from '#/lib/cx';

import { Pagination } from './Pagination';

const lessMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A list's controls in one bar, as nitro-studio has them: its search and filters (`children`) and
 * its count and pages at the end. It heads the card the list is in (its first child; the card is
 * `overflow-clip`, never `overflow-hidden`, which would stop it sticking). The bar stays at the top
 * of the page while the list scrolls under it, with a shadow once it has left its place, so the
 * next page is never a scroll back up away. When the list changes under it (`watch`: the search,
 * the filters and the page) a list scrolled past its start is brought back to it.
 */
export const ListToolbar = ({ children, page, watch }: {
    children?: ReactNode;
    page?: { offset: number; limit: number; total: number | undefined; onChange: (offset: number) => void };
    watch: readonly unknown[];
}) => {
    const start = useRef<HTMLDivElement>(null);
    const [ stuck, setStuck ] = useState(false);
    const key = JSON.stringify(watch);
    const lastKey = useRef(key);

    // Stuck once the place it would be has scrolled up past the top of the window.
    useEffect(() => {
        const element = start.current;

        if (!element)
            return;

        const observer = new IntersectionObserver(([ entry ]) => {
            if (entry)
                setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    // Another page, search or filter: the list from its start, when it was scrolled past it.
    useLayoutEffect(() => {
        if (lastKey.current === key)
            return;

        lastKey.current = key;

        const element = start.current;

        if (!element)
            return;

        const top = element.getBoundingClientRect().top + window.scrollY;

        if (window.scrollY > top + 1)
            window.scrollTo({ top, behavior: lessMotion() ? 'auto' : 'smooth' });
    }, [ key ]);

    return (
        <>
            {/* Where the list starts: what it scrolls back to, and what tells the bar it has left its place. */}
            <div ref={start} aria-hidden className="h-0" />
            <div
                className={cx(
                    'sticky top-0 z-20 border-b border-line bg-surface px-3 py-2.5 transition-shadow sm:px-4',
                    stuck && 'shadow-[0_6px_12px_-8px_rgb(0_0_0/0.25)]',
                )}
            >
                {/* One row: the controls wrap among themselves, the pages stay at its end. */}
                <div className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 [&>*]:max-w-full">{children}</div>
                    {page && page.total !== undefined && (
                        <div className="ml-auto flex h-9 shrink-0 items-center">
                            <Pagination offset={page.offset} limit={page.limit} total={page.total} onChange={page.onChange} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
