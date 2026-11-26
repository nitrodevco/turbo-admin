import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { cx } from '#/lib/cx';
import { type ListOrder, type Sorting, type SortKeys, useSortedRows } from '#/lib/sort';

import { PhoneSort, SortButton, type SortColumn } from './SortHeader';
import { Ago, LABEL_CLASS } from './ui';

/** A column's header; with `sort`, a key the list sorts by, it sorts the list when clicked. */
export interface RowListColumn extends SortColumn {
    className?: string;
}

/**
 * A list that reads as a table from the small breakpoint up, its columns sized by
 * <c>columns</c> (a grid template) across every row at once through subgrid, and on a phone as
 * stacked rows: each row's first cell on a line of its own, the rest flowing after it, so
 * nothing scrolls sideways. With <c>sorting</c>, the headers of the columns that have a `sort`
 * sort it, and a phone, which has no headers, says the order above the rows.
 */
export const RowList = ({ columns, headers, sorting, children }: { columns: string; headers: RowListColumn[]; sorting?: Sorting; children: ReactNode }) => (
    <div style={{ '--row-cols': columns } as CSSProperties} className="text-sm sm:grid sm:grid-cols-(--row-cols) sm:gap-x-4">
        {sorting && <PhoneSort columns={headers} sorting={sorting} />}
        <div className={cx('hidden border-b border-line px-4 py-2 sm:col-span-full sm:grid sm:grid-cols-subgrid', LABEL_CLASS)}>
            {headers.map((header, index) => (
                <span key={index} className={header.className}>
                    {header.sort && sorting
                        ? <SortButton label={header.label} sort={header.sort} first={header.first} sorting={sorting} />
                        : header.label}
                </span>
            ))}
        </div>
        <ul className="divide-y divide-line sm:col-span-full sm:grid sm:grid-cols-subgrid">{children}</ul>
    </div>
);

/**
 * A <c>RowList</c> of rows the panel holds whole, sorted in the browser: in `initial`, the column
 * the server sent them in (none for a set order of the list's own), until a header asks for another. `keys` says what each column with a
 * `sort` sorts by, and `children` draws a row (its index is its place in the sorted rows).
 */
export const SortedRowList = <T extends object>({ rows, keys, initial, children, ...list }: {
    columns: string;
    headers: RowListColumn[];
    rows: readonly T[];
    keys: SortKeys<T>;
    initial?: ListOrder;
    children: (row: T, index: number) => ReactNode;
}) => {
    const [ sorted, sorting ] = useSortedRows(rows, keys, initial);

    return <RowList {...list} sorting={sorting}>{sorted.map(children)}</RowList>;
};

/** One row of a <c>RowList</c>; its children are the cells, in the columns' order. */
export const Row = ({ children, className }: { children: ReactNode; className?: string }) => (
    <li
        className={cx(
            'group flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 hover:bg-subtle/60 [&>:first-child]:basis-full',
            // From a tablet up a row is the list's own columns: its gaps are the list's too (`normal`, in a subgrid), as its header's are,
            // or its columns would drift from the header's by half the difference at each gap.
            'sm:col-span-full sm:grid sm:grid-cols-subgrid sm:py-2.5 sm:[column-gap:normal] sm:[&>*]:min-w-0 sm:[&>:first-child]:basis-auto',
            className,
        )}
    >
        {children}
    </li>
);

/**
 * A row's When, its first column in a log: how long ago (or, with `format`, a clock time), the
 * date and time in full on hover. Smaller on a phone, where it sits on a line over the rest.
 */
export const WhenCell = ({ at, format }: { at: string; format?: (utc: string) => string }) => (
    <Ago at={at} format={format} className="text-xs whitespace-nowrap text-muted sm:text-sm" />
);

/** Words a cell needs on a phone, where there is no column header to say what it is. */
export const PhoneLabel = ({ children }: { children: ReactNode }) => <span className="text-muted sm:hidden">{children}</span>;

/**
 * A row of a list that opens in place to edit what it is: one open at a time, chosen by the
 * list. Closed it is a summary, a line a hand can hit; open, its editor under it.
 */
export const OpenRow = ({ open, onToggle, summary, children }: { open: boolean; onToggle: () => void; summary: ReactNode; children: ReactNode }) => (
    <li className={cx(open && 'bg-subtle/40')}>
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-subtle/60 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted"
        >
            {open ? <ChevronDown /> : <ChevronRight />}
            <span className="min-w-0 flex-1">{summary}</span>
        </button>
        {open && <div className="border-t border-line px-4 py-4 sm:pl-11">{children}</div>}
    </li>
);
