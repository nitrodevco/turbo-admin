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

/** A moment as the viewer's clock and calendar have it: "Nov 25, 2026, 3:42 PM". */
export const formatDateTime = (at: string | number) =>
    new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** A moment as the viewer's clock has it, for a time today: "3:42 PM". */
export const formatClock = (at: string | number) => new Date(at).toLocaleTimeString(undefined, { timeStyle: 'short' });

/** A UTC time from the server (marked Z or not), as a number. */
export const isoTime = (iso: string | null) => (iso ? Date.parse(/Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`) : null);

/**
 * A UTC time from the server in UTC, short: "2026-12-01 00:00", for a time the hotel keeps by the
 * UTC day (a calendar's start, a track's dates, a voucher's expiry). Shown where "UTC" is said: in
 * its column's heading, or beside it.
 */
export const formatUtc = (iso: string) => new Date(isoTime(iso) ?? 0).toISOString().slice(0, 16).replace('T', ' ');

/**
 * A UTC time from the server for a `datetime-local` input, read as UTC, and back (null when it
 * is empty). A field that takes these says "(UTC)" in its label.
 */
export const isoToInput = (iso: string | null) => (iso ? iso.replace(/Z$/, '').slice(0, 16) : '');
export const inputToIso = (value: string) => (value ? `${value}:00Z` : null);

/**
 * A UTC time for a `datetime-local` input in the viewer's own time, and back (null when it is
 * empty). A field that takes these says "(your time)" in its label.
 */
export const isoToLocalInput = (iso: string | null) => {
    if (!iso)
        return '';

    const at = new Date(iso);

    return new Date(at.getTime() - at.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
export const localInputToIso = (value: string) => (value ? new Date(value).toISOString() : null);
