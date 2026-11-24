/** Joins class names, skipping the falsy ones: `cx('a', on && 'b')`. */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

/**
 * A list row's fill: the accent on the chosen row, and on the others a hover as any row's. Never
 * both on one row: a hover beside the chosen fill would grey it out under the pointer, the
 * stylesheet's order and not the class list's deciding which of the two shows.
 */
export const rowFill = (chosen: boolean) => (chosen ? 'bg-accent-soft' : 'hover:bg-subtle/60');
