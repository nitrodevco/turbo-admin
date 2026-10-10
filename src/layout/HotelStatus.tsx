import { ChevronRight, X } from 'lucide-react';

import { useLive } from '#/api/live';
import { useDashboard, useHotelAbilities } from '#/api/queries';
import { useModalDialog } from '#/components/dialog';
import { cx } from '#/lib/cx';
import { HotelControls } from '#/pages/HotelControls';

import { phaseOf, type PhaseTone } from './availability';
import { useHotelSheet } from './hotelSheet';

type Tone = PhaseTone;

const DOT: Record<Tone, string> = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' };
const TEXT: Record<Tone, string> = { good: 'text-good', warn: 'text-warn', bad: 'text-bad' };

/** A dot in the phase's colour that pulses while the hotel is not simply open, or while the stream is live. */
const Dot = ({ tone, pulse }: { tone: Tone; pulse: boolean }) => (
    <span className="relative flex size-2 shrink-0">
        {pulse && <span className={cx('absolute inline-flex size-full animate-ping rounded-full opacity-60', DOT[tone])} />}
        <span className={cx('relative inline-flex size-2 rounded-full', DOT[tone])} />
    </span>
);

/** Whether the viewer may do anything to the hotel, so the status opens its controls. */
const useCanControl = () => {
    const { data: can } = useHotelAbilities();

    return !!can && (can.alert || can.maintenance || can.shutdown || can.welcomeMessage);
};

/**
 * The hotel's state at the top of the sidebar, on every page: open or not, and how many are on.
 * It opens the hotel's controls, when the viewer has any.
 */
export const HotelStatusCard = () => {
    const { data } = useDashboard();
    const live = useLive(state => state.connected);
    const canControl = useCanControl();
    const setOpen = useHotelSheet(state => state.setOpen);

    if (!data)
        return <div className="mx-3 h-[58px] animate-pulse rounded-xl border border-line bg-surface" />;

    const phase = phaseOf(data.availability);

    return (
        <button
            type="button"
            disabled={!canControl}
            onClick={() => setOpen(true)}
            title={canControl ? 'Hotel controls' : undefined}
            className="group mx-3 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition-colors enabled:hover:border-muted/50"
        >
            <Dot tone={phase.tone} pulse={phase.tone !== 'good' || live} />
            <span className="min-w-0 flex-1">
                <span className={cx('block text-[13px] leading-snug font-medium text-pretty', TEXT[phase.tone])}>{phase.label}</span>
                <span className="block truncate font-mono text-[11px] text-muted tabular-nums">
                    {data.playersOnline.toLocaleString()} online
                </span>
            </span>
            {canControl && <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />}
        </button>
    );
};

/** The same at a glance in a phone's header: the colour and who is on. */
export const HotelStatusPill = () => {
    const { data } = useDashboard();
    const canControl = useCanControl();
    const setOpen = useHotelSheet(state => state.setOpen);

    if (!data)
        return null;

    const phase = phaseOf(data.availability);

    return (
        <button
            type="button"
            disabled={!canControl}
            onClick={() => setOpen(true)}
            aria-label={`Hotel ${phase.label.toLowerCase()}, ${data.playersOnline} online${canControl ? '. Hotel controls' : ''}`}
            className={cx(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-mono text-xs font-medium tabular-nums lg:hidden',
                phase.tone === 'good' ? 'border-line text-ink' : phase.tone === 'warn' ? 'border-warn-line bg-warn-soft text-warn' : 'border-bad-line bg-bad-soft text-bad',
            )}
        >
            <Dot tone={phase.tone} pulse={phase.tone !== 'good'} />
            {phase.tone === 'good' ? data.playersOnline.toLocaleString() : phase.short}
        </button>
    );
};

/**
 * The hotel's controls, wherever they are opened from: an alert to everyone, maintenance, a
 * shutdown and the welcome message. A sheet from the bottom of a phone, a panel in the middle of a
 * bigger screen.
 */
export const HotelSheet = () => {
    const open = useHotelSheet(state => state.open);
    const setOpen = useHotelSheet(state => state.setOpen);
    const { data } = useDashboard();
    const dialog = useModalDialog(open, () => setOpen(false));
    const phase = data ? phaseOf(data.availability) : null;

    return (
        <dialog
            {...dialog}
            aria-label="Hotel controls"
            className="mx-0 mt-auto mb-0 max-h-[92dvh] w-full max-w-none animate-sheet overflow-y-auto rounded-t-2xl border border-line bg-surface p-0 text-ink shadow-2xl sm:m-auto sm:max-w-lg sm:animate-rise sm:rounded-2xl"
        >
            {open && data && phase && (
                <div className="flex flex-col gap-3 px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
                    <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
                    <div className="flex items-center gap-3 px-1">
                        <Dot tone={phase.tone} pulse={phase.tone !== 'good'} />
                        <div className="min-w-0 flex-1">
                            <h2 className="text-[15px] font-semibold">Hotel controls</h2>
                            <p className={cx('text-xs', TEXT[phase.tone])}>
                                {phase.label}
                                {data.availabilityAtUtc && ` at ${new Date(data.availabilityAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                <span className="text-muted"> · {data.playersOnline.toLocaleString()} online</span>
                            </p>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-10 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink">
                            <X className="size-4" />
                        </button>
                    </div>
                    <HotelControls phase={data.availability} />
                </div>
            )}
        </dialog>
    );
};
