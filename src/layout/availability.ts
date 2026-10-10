import type { AvailabilityPhase } from '#/api/types';

export type PhaseTone = 'good' | 'warn' | 'bad';

const PHASES: Record<string, { label: string; short: string; tone: PhaseTone }> = {
    Open: { label: 'Open', short: 'Open', tone: 'good' },
    MaintenanceScheduled: { label: 'Maintenance scheduled', short: 'Maint. soon', tone: 'warn' },
    Maintenance: { label: 'In maintenance', short: 'Maintenance', tone: 'warn' },
    ShutdownScheduled: { label: 'Shutdown scheduled', short: 'Shutting down', tone: 'bad' },
    ShuttingDown: { label: 'Shutting down', short: 'Shutting down', tone: 'bad' },
};

/** Whether the hotel lets players in, in words (in full, and short for a pill) and its colour; an unknown future phase as the server names it. */
export const phaseOf = (phase: AvailabilityPhase) => PHASES[phase] ?? { label: phase, short: phase, tone: 'warn' as PhaseTone };
