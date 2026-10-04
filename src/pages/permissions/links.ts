/** How long a new assignment lasts: the server reads `30m`, `12h`, `7d`, `2w`; empty is permanent. */
export const DURATIONS: { value: string; label: string }[] = [
    { value: '', label: 'Permanent' },
    { value: '1h', label: '1 hour' },
    { value: '12h', label: '12 hours' },
    { value: '1d', label: '1 day' },
    { value: '7d', label: '7 days' },
    { value: '14d', label: '14 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
];

/** Where an audit row or holder goes: a group's page by name, a player's by id. */
export const targetLink = (type: string, id: number, name: string) =>
    type === 'Group' ? `/permissions/groups/${encodeURIComponent(name)}` : `/permissions/players/${id}`;
