/** A player's page's tabs, each in the path: `/players/5/inventory`. */
export const PLAYER_TABS = [ 'overview', 'inventory', 'account' ] as const;

export type PlayerTab = (typeof PLAYER_TABS)[number];

export const PLAYER_TAB_LABELS: Record<PlayerTab, string> = {
    overview: 'Overview',
    inventory: 'Inventory',
    account: 'Account',
};
