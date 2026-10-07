const DAYS_PER_MONTH = 31;

/** A membership's length in words: months, or months and days. */
export const lengthOf = (days: number) => {
    const months = Math.floor(days / DAYS_PER_MONTH);
    const rest = days % DAYS_PER_MONTH;
    const parts = [];

    if (months > 0)
        parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);

    if (rest > 0 || months === 0)
        parts.push(`${rest} ${rest === 1 ? 'day' : 'days'}`);

    return parts.join(' and ');
};

const LENGTH_NAME = /^(habbo_club|builders_club)_(\d+)_(month|months|days?)$/;

/**
 * The membership a length name key says, as the server names memberships by their length:
 * `habbo_club_3_months` is 93 days of Habbo Club, `builders_club_45_days` 45 of Builders Club.
 * Null for any other name key.
 */
export const membershipOfName = (name: string): { subscription: 'HabboClub' | 'BuildersClub'; days: number } | null => {
    const match = LENGTH_NAME.exec(name.trim());

    if (!match)
        return null;

    const count = Number(match[2]);

    if (!(count > 0))
        return null;

    return {
        subscription: match[1] === 'builders_club' ? 'BuildersClub' : 'HabboClub',
        days: match[3]!.startsWith('month') ? count * DAYS_PER_MONTH : count,
    };
};
