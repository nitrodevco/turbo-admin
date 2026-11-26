/** A size in bytes, as people read it, up to the gigabytes a whole hotel's bundles come to. */
export const formatBytes = (bytes: number) => {
    const units = [ 'B', 'KB', 'MB', 'GB', 'TB' ];
    let size = bytes;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }

    return unit === 0 ? `${size} B` : `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`;
};

/** A duration given in milliseconds, in the unit that reads best: "240 ms", "1.5 s". */
export const formatDuration = (ms: number) =>
    (ms >= 1000 ? `${(ms / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} s` : `${Math.round(ms).toLocaleString()} ms`);
