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

/** A moment as a date and time, for a title on hover. */
export const formatTime = (utc: string) => new Date(utc).toLocaleString();
