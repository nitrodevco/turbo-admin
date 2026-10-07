import { Search } from 'lucide-react';
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

/**
 * Jumping to a room from anywhere: its id opens it, anything else searches room names. Ctrl K (or
 * Cmd K) puts the cursor in it.
 */
export const JumpBox = () => {
    const navigate = useNavigate();
    const input = useRef<HTMLInputElement>(null);
    const [ text, setText ] = useState('');

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                input.current?.focus();
                input.current?.select();
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            input.current?.blur();

            return;
        }

        const query = text.trim();

        if (event.key !== 'Enter' || query === '')
            return;

        navigate(/^\d+$/.test(query) ? `/rooms/${query}` : `/rooms?${new URLSearchParams({ q: query, by: 'name', page: '1' })}`);
        setText('');
        input.current?.blur();
    };

    return (
        <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-muted focus-within:border-accent">
            <Search className="size-4 shrink-0" />
            <input
                ref={input}
                value={text}
                onChange={event => setText(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Jump to a room by name or id"
                aria-label="Jump to a room by name or id"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
            />
            <kbd className="rounded border border-line px-1.5 font-mono text-[10px]">Ctrl K</kbd>
        </label>
    );
};
