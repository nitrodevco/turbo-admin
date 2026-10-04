/** The admin API's shapes, as Turbo.Admin serializes them (camelCase JSON). */

export interface AdminPlayer {
    id: number;
    name: string;
}

export interface SessionResponse {
    sessionToken: string;
    expiresAtUtc: string;
    player: AdminPlayer;
}

export interface MeResponse {
    id: number;
    name: string;
    sessionExpiresAtUtc: string;
    /** Holds `permissions.manage`: may change groups and players lighter than their heaviest group. */
    canManagePermissions: boolean;
    /** Holds `admin.passkeys.reset`: may give other staff a link to set up or replace their passkey. */
    canResetPasskeys: boolean;
    /** Holds `admin.rooms.view`: may find and inspect rooms. */
    canViewRooms: boolean;
    /** Holds `admin.permissions.view`: may see groups, players' permissions and the log. */
    canViewPermissions: boolean;
}

export interface DashboardRoom {
    id: number;
    name: string;
    ownerName: string;
    population: number;
    playersMax: number;
}

/** The server's `HotelAvailabilityPhase`; an unknown future phase still reads as a string. */
export type AvailabilityPhase = 'Open' | 'MaintenanceScheduled' | 'Maintenance' | 'ShutdownScheduled' | 'ShuttingDown' | (string & {});

export interface DashboardResponse {
    version: string;
    startedAtUtc: string;
    playersOnline: number;
    roomsLoaded: number;
    silosActive: number;
    silosTotal: number;
    workingSetMb: number;
    managedMb: number;
    availability: AvailabilityPhase;
    availabilityAtUtc: string | null;
    busiestRooms: DashboardRoom[];
}

export interface CommandInfo {
    name: string;
    aliases: string[];
    description: string;
    category: string;
    /** A room command: it only runs typed in a room, so the console cannot run it. */
    needsRoom: boolean;
    /** The help the game shows for it: the usage line first, then one line per parameter. */
    help: string[];
}

export interface CommandOutputLine {
    kind: 'reply' | 'notice';
    text: string;
}

/** The command runner's `CommandOutcome`, plus `NeedsRoom` for a room command the console cannot run. */
export type CommandOutcome = 'Completed' | 'Refused' | 'RoomLevel' | 'BindFailed' | 'Vetoed' | 'AwaitingConfirmation' | 'NeedsRoom' | (string & {});

export interface RunCommandResponse {
    found: boolean;
    outcome: CommandOutcome | null;
    lines: CommandOutputLine[];
}

export interface SetupInfoResponse {
    playerName: string;
    /** Finishing the setup replaces the passkeys the player already has. */
    replacesExisting: boolean;
}

export interface AccountPasskey {
    id: number;
    name: string;
    createdAtUtc: string;
    lastUsedAtUtc: string | null;
}

export interface AccountResponse {
    passkeys: AccountPasskey[];
}

export interface PasskeyLinkResponse {
    playerName: string;
    link: string;
    expiresAtUtc: string;
    /** Using it replaces every passkey the player has. */
    replacesExisting: boolean;
    /** Whether they hold `admin.panel`; without it the passkey signs them in to nothing. */
    hasPanelAccess: boolean;
}

export type RoomSearchMode = 'name' | 'owner' | 'id';

export interface RoomListItem {
    id: number;
    name: string;
    ownerId: number;
    ownerName: string;
    doorMode: string;
    playersMax: number;
    categoryName: string | null;
    isLoaded: boolean;
    population: number;
    lastActiveUtc: string;
}

export interface RoomListResponse {
    total: number;
    page: number;
    pageSize: number;
    rooms: RoomListItem[];
}

export interface RoomPlayerRef {
    id: number;
    name: string;
}

export interface RoomBanItem {
    playerId: number;
    name: string;
    expiresAtUtc: string;
}

export interface RoomDetailResponse {
    id: number;
    name: string;
    description: string;
    ownerId: number;
    ownerName: string;
    model: string;
    categoryId: number | null;
    categoryName: string | null;
    tags: string[];
    doorMode: string;
    /** Whether the room has a password; the password itself is never sent. */
    hasPassword: boolean;
    playersMax: number;
    tradeMode: string;
    allowPets: boolean;
    allowPetsEat: boolean;
    allowWalkThrough: boolean;
    whoCanMute: string;
    whoCanKick: string;
    whoCanBan: string;
    chatFloodProtection: string;
    hideWalls: boolean;
    staffPick: boolean;
    hiddenByBuildersClub: boolean;
    score: number;
    createdAtUtc: string;
    lastActiveUtc: string;
    isLoaded: boolean;
    playersInside: RoomPlayerRef[];
    rightsHolders: RoomPlayerRef[];
    bans: RoomBanItem[];
}
