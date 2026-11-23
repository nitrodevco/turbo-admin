import type { PluginState } from '#/api/plugins';
import type { BadgeTone } from '#/components/ui';

/** A plugin's state as a tag says it, and its tone: the Plugins page's, and a theme's whose plugin is not loaded. */
export const PLUGIN_STATES: Record<PluginState, { label: string; tone: BadgeTone }> = {
    loaded: { label: 'loaded', tone: 'green' },
    failed: { label: 'failed', tone: 'red' },
    rejected: { label: 'refused', tone: 'red' },
    disabled: { label: 'off', tone: 'amber' },
    not_loaded: { label: 'not loaded', tone: 'neutral' },
};
