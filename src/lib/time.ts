const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

const STEPS: [ Intl.RelativeTimeFormatUnit, number ][] = [
    [ 'second', 60 ],
    [ 'minute', 60 ],
    [ 'hour', 24 ],
    [ 'day', 30 ],
    [ 'month', 12 ],
    [ 'year', Number.POSITIVE_INFINITY ],
];

/** How long ago (or how far ahead) a moment is, in the largest unit that fits: "5 min ago", "in 2 days". */
export const fromNow = (utc: string, now = Date.now()) => {
    let amount = (new Date(utc).getTime() - now) / 1000;

    for (const [ unit, size ] of STEPS) {
        if (Math.abs(amount) < size)
            return relative.format(Math.round(amount), unit);

        amount /= size;
    }

    return relative.format(Math.round(amount), 'year');
};
