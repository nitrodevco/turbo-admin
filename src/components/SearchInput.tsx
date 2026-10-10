import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

import { cx } from '#/lib/cx';

import { FIELD_CLASS } from './ui';

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
