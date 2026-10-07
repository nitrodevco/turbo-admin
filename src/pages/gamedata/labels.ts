/** A size in bytes, as people read it. */
export const formatSize = (bytes: number) => {
    if (bytes < 1024)
        return `${bytes} B`;

    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** A JSON value as a short text: a string without its quotes, null as a dash. */
export const showValue = (json: string | null | undefined) => {
    if (json === null || json === undefined || json === 'null')
        return '-';

    try {
        const value: unknown = JSON.parse(json);

        if (typeof value === 'string')
            return value === '' ? '""' : value;

        if (value && typeof value === 'object' && 'color' in value && Array.isArray(value.color))
            return value.color.join(', ');

        return JSON.stringify(value);
    } catch {
        return json;
    }
};
