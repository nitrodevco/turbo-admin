import type { PlayerDetailResponse } from '#/api/players';
import { fromNow } from '#/lib/time';

/** Until when a restriction (a ban, a mute, a trade lock) holds, in words: "ends in 2 hr", or "for good". */
export const restrictionLabel = (restriction: { untilUtc: string | null }) =>
    restriction.untilUtc ? `ends ${fromNow(restriction.untilUtc)}` : 'for good';

/** The ban that holds on them now, if any. */
export const activeBan = (player: PlayerDetailResponse) => player.sanctions.find(x => x.isActive && x.kind === 'Ban');
