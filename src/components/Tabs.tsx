import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { cx } from '#/lib/cx';

export interface TabItem {
    value: string;
    label: ReactNode;
    icon?: ReactNode;
    /** Shown beside the label, e.g. how many items the tab holds. */
    count?: number;
    /** What the tab is for, on hover. */
    title?: string;
    /** The page the tab opens. Tabs with one are links; tabs without one switch by `onChange`. */
    to?: string;
}

interface TabsProps {
    value: string | undefined;
    tabs: TabItem[];
    onChange?: (value: string) => void;
    /** Ids for the tabs and the panels they control, for a tab row that switches content in place. */
    ids?: { tab: (value: string) => string; panel: (value: string) => string };
    /** Draw the row's own bottom rule; off where the row sits on another line (the page header's). */
    rule?: boolean;
    /** What the row is, for screen readers. */
    label?: string;
    className?: string;
}

type Line = { left: number; width: number };

/**
 * Where each set of tabs last had its line, by the tabs it holds. A page's header tabs are drawn
 * again on the next page, and the line glides on from where it was instead of appearing.
 */
const lastLines = new Map<string, Line>();

const tabClass = (active: boolean) => cx(
    'flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors [&>svg]:size-4',
    active ? 'text-ink' : 'text-muted hover:text-ink',
);

type Edges = { start: boolean; end: boolean };

/**
 * Which ends of a row that scrolls sideways have more of it past them: none while it all fits,
 * kept as it scrolls and as it or its tabs change size.
 */
const useOverflowEdges = (row: RefObject<HTMLElement | null>, group: string) => {
    const [ edges, setEdges ] = useState<Edges>({ start: false, end: false });

    useEffect(() => {
        const element = row.current;

        if (!element)
            return;

        const measure = () => {
            const start = element.scrollLeft > 1;
            const end = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;

            setEdges(was => (was.start === start && was.end === end ? was : { start, end }));
        };

        const resized = new ResizeObserver(measure);

        // The row, and each tab in it: a count that grows makes the row overflow without resizing it.
        for (const each of [ element, ...element.children ])
            resized.observe(each);

        element.addEventListener('scroll', measure, { passive: true });
        measure();

        return () => {
            resized.disconnect();
            element.removeEventListener('scroll', measure);
        };
    }, [ row, group ]);

    return edges;
};

/** The row's ends fading out where tabs go on past them, so a phone shows there are more to scroll to. */
const fadeOf = ({ start, end }: Edges) => (start || end
    ? `linear-gradient(to right, ${start ? 'transparent' : '#000'}, #000 2rem, #000 calc(100% - 2rem), ${end ? 'transparent' : '#000'})`
    : undefined);

/**
 * How many a thing holds, in a pill beside its name: a tab's, a card's title (`Panel count`).
 * `active` beside a chosen tab, in the accent.
 */
export const Count = ({ count, active, className }: { count: number; active?: boolean; className?: string }) => (
    <span className={cx('rounded-full px-1.5 text-xs leading-5 font-medium tabular-nums transition-colors', active ? 'bg-accent-soft text-accent' : 'bg-subtle text-muted', className)}>
        {count.toLocaleString()}
    </span>
);

/**
 * A row of tabs with the chosen one in the ink and underlined in the accent; the line slides from tab to tab as the choice
 * moves. Tabs that switch in place follow the WAI-ARIA tabs pattern: one stop for Tab, and the
 * arrow keys (with Home and End) move between them. Tabs with a `to` are links to their pages.
 */
export const Tabs = ({ value, tabs, onChange, ids, rule = true, label, className }: TabsProps) => {
    const list = useRef<HTMLDivElement>(null);
    const group = tabs.map(tab => tab.value).join('|');
    const [ line, setLine ] = useState<Line | null>(() => lastLines.get(group) ?? null);

    // Measured when the choice changes and whenever the chosen tab's size does (a count that grows).
    useEffect(() => {
        const active = list.current?.querySelector<HTMLElement>('[data-active]');

        if (!active)
            return;

        const observer = new ResizeObserver(() => {
            const measured = { left: active.offsetLeft, width: active.offsetWidth };

            lastLines.set(group, measured);
            setLine(measured);
        });

        observer.observe(active);

        // A row wider than a phone scrolls sideways: the chosen tab is brought into sight. Only the
        // row moves; scrollIntoView would scroll the window too, to a row below the fold.
        const row = list.current;

        if (row) {
            const start = active.offsetLeft;
            const end = start + active.offsetWidth;

            if (start < row.scrollLeft)
                row.scrollLeft = start;
            else if (end > row.scrollLeft + row.clientWidth)
                row.scrollLeft = end - row.clientWidth;
        }

        return () => observer.disconnect();
    }, [ value, group ]);

    const handleKeyDown = (event: KeyboardEvent, index: number) => {
        const next = {
            ArrowRight: index + 1,
            ArrowLeft: index - 1,
            Home: 0,
            End: tabs.length - 1,
        }[event.key];

        if (next === undefined)
            return;

        event.preventDefault();

        const target = (next + tabs.length) % tabs.length;
        const tab = tabs[target];

        if (!tab)
            return;

        onChange?.(tab.value);
        list.current?.querySelectorAll<HTMLElement>('[role="tab"]')[target]?.focus();
    };

    const edges = useOverflowEdges(list, group);
    const linked = tabs.some(tab => tab.to !== undefined);

    return (
        <div
            ref={list}
            role={linked ? undefined : 'tablist'}
            aria-label={label}
            // Its rule is a shadow, not a border, so the line sits on it rather than under it.
            className={cx('no-scrollbar relative flex gap-1 overflow-x-auto', rule && 'shadow-[inset_0_-1px_0_var(--color-line)]', className)}
            style={{ maskImage: fadeOf(edges) }}
        >
            {tabs.map((tab, index) => {
                const active = tab.value === value;
                const content = (
                    <>
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && <Count count={tab.count} active={active} />}
                    </>
                );

                return tab.to !== undefined
                    ? (
                            <Link
                                key={tab.value}
                                to={tab.to}
                                title={tab.title}
                                aria-current={active ? 'page' : undefined}
                                data-active={active || undefined}
                                className={tabClass(active)}
                            >
                                {content}
                            </Link>
                        )
                    : (
                            <button
                                key={tab.value}
                                type="button"
                                role="tab"
                                id={ids?.tab(tab.value)}
                                aria-selected={active}
                                aria-controls={ids?.panel(tab.value)}
                                tabIndex={active ? 0 : -1}
                                title={tab.title}
                                data-active={active || undefined}
                                onClick={() => onChange?.(tab.value)}
                                onKeyDown={event => handleKeyDown(event, index)}
                                className={tabClass(active)}
                            >
                                {content}
                            </button>
                        );
            })}
            {line && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-accent transition-all duration-300 ease-out"
                    style={{ left: line.left, width: line.width }}
                />
            )}
        </div>
    );
};
