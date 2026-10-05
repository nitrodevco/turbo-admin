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
