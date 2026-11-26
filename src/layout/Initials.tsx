import { useSession } from '#/auth/session';
import { cx } from '#/lib/cx';

/** The signed-in player's initials on a tile of the accent's blue: yours, by your name at the sidebar's foot and in the More sheet. */
export const Initials = ({ className }: { className?: string }) => {
    const name = useSession(state => state.session?.player.name) ?? '';

    return (
        <span aria-hidden className={cx('grid shrink-0 place-items-center rounded-md bg-accent-solid font-semibold text-on-accent', className)}>
            {name.slice(0, 2).toUpperCase()}
        </span>
    );
};
