import { cx } from '#/lib/cx';

/** The mark: a slanted T on a tile of the accent's blue, with the lines of its speed trailing behind it. */
export const LogoMark = ({ className }: { className?: string }) => (
    <span
        aria-hidden
        className={cx(
            'grid shrink-0 place-items-center rounded-[10px] bg-accent-solid text-on-accent ring-1 ring-accent-edge ring-inset',
            className,
        )}
    >
        <svg viewBox="0 0 24 24" className="size-[62%]" fill="currentColor">
            <g transform="translate(2.4 0) skewX(-12)">
                <rect x="8" y="4.5" width="13" height="3.6" rx="1.8" />
                <rect x="12.7" y="4.5" width="3.6" height="15" rx="1.8" />
                <rect x="1.5" y="10.2" width="8.5" height="2.2" rx="1.1" opacity="0.7" />
                <rect x="3.5" y="14.6" width="6.5" height="2.2" rx="1.1" opacity="0.45" />
            </g>
        </svg>
    </span>
);

/** The mark and the name beside it: "Turbo", set as the page titles are, and under it what this is. */
export const Logo = ({ className }: { className?: string }) => (
    <span className={cx('flex items-center gap-2.5', className)}>
        <LogoMark className="size-9" />
        <span className="flex flex-col">
            <span className="font-display text-base leading-tight text-ink">Turbo</span>
            <span className="text-xs leading-tight text-muted">Hotel admin</span>
        </span>
    </span>
);
