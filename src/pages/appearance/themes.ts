import type { PluginTheme, ThemeAudience, ThemeStatus } from '#/api/appearance';
import type { BadgeTone } from '#/components/ui';

/** A theme in the tree: how deep it is under the base theme. */
export interface ThemeNode {
    theme: PluginTheme;
    depth: number;
}

/**
 * The themes as a tree under the base theme (`habbo`, Habbo's own look): each under the theme it
 * extends, depth first, in key order; one extending none, or a theme not installed, at the top.
 */
export const themeTree = (themes: readonly PluginTheme[], base: string): ThemeNode[] => {
    const keys = new Set(themes.map(theme => theme.key));
    const under = (parent: string | null, depth: number, seen: Set<string>): ThemeNode[] => themes
        .filter(theme => (parent === null ? !theme.extends || (theme.extends !== base && !keys.has(theme.extends)) : theme.extends === parent) && !seen.has(theme.key))
        .flatMap(theme => [ { theme, depth }, ...under(theme.key, depth + 1, new Set([ ...seen, theme.key ])) ]);

    return [ ...under(base, 1, new Set()), ...under(null, 0, new Set()) ];
};

/**
 * For each theme in the tree, for each level from 1 to its depth: whether another theme at that
 * level comes after it under the same parent, so the tree's line at that level goes on below it.
 */
export const onwardLevels = (tree: readonly ThemeNode[]) => tree.map((node, at) => Array.from({ length: node.depth }, (_, index) => {
    const level = index + 1;

    for (const next of tree.slice(at + 1)) {
        if (next.depth < level) return false;

        if (next.depth === level) return true;
    }

    return false;
}));

/** The theme's name as staff know it: the hotel's own plugin is "This hotel". */
export const themeName = (theme: Pick<PluginTheme, 'key' | 'name'>) => (theme.key === 'hotel' ? 'This hotel' : theme.name ?? theme.key);

/** Who a theme reaches, in a word or two; a theme no one set (one just made or installed) is in development. */
export const STATUS_LABEL: Record<ThemeStatus, string> = { live: 'Live', development: 'In development', off: 'Off' };

export const STATUS_TONE: Record<ThemeStatus, BadgeTone> = { live: 'green', development: 'amber', off: 'neutral' };

/** The client page staff open a theme in for one load: the preview host's page without `?preview`, with `?theme=`. */
export const previewLink = (preview: string | undefined, key: string) => {
    if (!preview) return null;

    try {
        const url = new URL(preview);

        url.searchParams.delete('preview');
        url.searchParams.set('theme', key);

        return url.toString();
    } catch {
        return null;
    }
};

/** What `reachOf` says for a theme no player draws. */
const NO_ONE = 'No one';

const NOT_OFFERED = 'Not offered to players';

/** The players and groups a theme in development is given, as staff read them. */
export const audienceNames = (audience: ThemeAudience) => [ ...audience.players.map(player => player.name ?? `#${player.id}`), ...audience.groups.map(group => `${group} (group)`) ];

/**
 * Who draws a theme, in a few words, as the server decides it (`ThemeChains`, `docs/plugin-data.md`
 * "Who gets which theme"): a Live theme every player when it is the default or the hotel has none,
 * and those who chose it when players may; one in development only its players and groups, and
 * staff who may preview themes. The hotel's own theme is also drawn under every theme extending it.
 */
export const reachOf = (audience: ThemeAudience, hasDefault: boolean) => {
    if (audience.status === 'off') return NO_ONE;

    if (audience.status === 'development') return audienceNames(audience).join(', ') || 'Staff who preview only';

    if (audience.isDefault || !hasDefault) return 'Every player, by default';

    if (audience.key === 'hotel') return 'Under the themes that extend it';

    return audience.selectable ? 'Players who choose it' : NOT_OFFERED;
};

/** What `reachOf` says when no player draws a theme: said muted. A theme whose plugin is not loaded reaches no one too. */
export const NOBODY: ReadonlySet<string> = new Set([ NO_ONE, NOT_OFFERED ]);

/** Whether the hotel has a default: without one, every Live theme is every player's. */
export const hasLiveDefault = (audiences: readonly ThemeAudience[] | undefined) => !!audiences?.some(theme => theme.isDefault && theme.status === 'live');
