import { ArrowRight, Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

import { cx } from '#/lib/cx';

import { FIELD_CLASS, FIELD_LOOK } from './ui';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
    value: string;
    onValueChange: (value: string) => void;
    /** Classes for the box around it: its width, mostly. Full width unless given. */
    className?: string;
};

/**
 * A text box to find things by, with the magnifier inside it and a button that empties it. Named
 * for screen readers by its placeholder unless given an `aria-label`.
 */
export const SearchInput = ({ value, onValueChange, className, placeholder, ...input }: SearchInputProps) => (
    <div className={cx('relative', className ?? 'w-full')}>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
            type="search"
            aria-label={placeholder}
            {...input}
            placeholder={placeholder}
            value={value}
            onChange={event => onValueChange(event.target.value)}
            className={cx(FIELD_CLASS, 'w-full pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden')}
        />
        {value && (
            <button
                type="button"
                onClick={() => onValueChange('')}
                aria-label="Clear"
                className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink sm:size-7"
            >
                <X className="size-3.5" />
            </button>
        )}
    </div>
);

/** What a server search searches by, chosen at the start of its field: a player's name, their id... */
export interface SearchMode {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}

/**
 * A search the server runs, typed and then sent, in one field: the magnifier, the words, and at its
 * end the arrow that sends them (Enter does too, and a phone's keyboard shows a search key); the
 * arrow is in the accent once there is something to send, and `disabled` while there is nothing to
 * search for. With `mode`, what it searches by is a choice at the field's start ("Name"), so the
 * choice and the words read as one control. It goes in the form that sends it.
 */
export const SearchWithButton = ({ disabled, mode, value, onValueChange, placeholder, ...input }: Omit<SearchInputProps, 'className'> & { disabled?: boolean; mode?: SearchMode }) => (
    <div className={cx('flex h-10 min-w-[min(100%,18rem)] flex-1 items-center focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/25 sm:h-8 sm:max-w-md', FIELD_LOOK)}>
        {mode && (
            <>
                <select
                    aria-label={mode.label}
                    value={mode.value}
                    onChange={event => mode.onChange(event.target.value)}
                    className="h-full shrink-0 rounded-l-lg bg-transparent pl-3 text-base font-medium text-ink outline-none sm:pl-2.5 sm:text-ui"
                >
                    {mode.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <span aria-hidden className="h-5 w-px shrink-0 bg-line" />
            </>
        )}
        <Search aria-hidden className="ml-3 size-4 shrink-0 text-muted sm:ml-2.5" />
        <input
            type="search"
            enterKeyHint="search"
            aria-label={placeholder}
            {...input}
            placeholder={placeholder}
            value={value}
            onChange={event => onValueChange(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-base text-ink outline-none placeholder:text-muted sm:text-ui [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
            <button type="button" onClick={() => onValueChange('')} aria-label="Clear" className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:text-ink sm:size-6">
                <X className="size-3.5" />
            </button>
        )}
        <button
            type="submit"
            aria-label="Search"
            title="Search"
            disabled={disabled}
            className={cx(
                'mr-1 grid size-8 shrink-0 place-items-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40 sm:size-6 [&>svg]:size-4 sm:[&>svg]:size-3.5',
                value.trim() ? 'bg-accent-solid text-on-accent hover:bg-accent-solid-hover' : 'text-muted hover:bg-subtle hover:text-ink',
            )}
        >
            <ArrowRight />
        </button>
    </div>
);
