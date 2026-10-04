/** Words for the server's room setting names (its enum members). Unknown ones show as they are. */

const DOOR_MODES: Record<string, string> = {
    Open: 'Open',
    Locked: 'Doorbell',
    Password: 'Password',
    Invisible: 'Invisible',
};

const TRADE_MODES: Record<string, string> = {
    Disabled: 'Nobody',
    RoomOwnerAndRights: 'Owner and rights holders',
    Everyone: 'Everyone',
};

const WHO: Record<string, string> = {
    Owner: 'Owner',
    Rights: 'Rights holders',
    All: 'Everyone',
    GroupRights: 'Group rights holders',
    RightsOrGroup: 'Rights holders or group',
};

const CHAT_FLOOD: Record<string, string> = {
    Extra: 'Strict',
    Normal: 'Normal',
    Minimal: 'Relaxed',
};

export const doorModeLabel = (mode: string) => DOOR_MODES[mode] ?? mode;
export const tradeModeLabel = (mode: string) => TRADE_MODES[mode] ?? mode;
export const whoLabel = (who: string) => WHO[who] ?? who;
export const chatFloodLabel = (setting: string) => CHAT_FLOOD[setting] ?? setting;

export const formatDateTime = (utc: string) =>
    new Date(utc).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
