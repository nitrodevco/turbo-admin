import type { RunCommandResponse } from '#/api/types';
import { cx } from '#/lib/cx';

import { Button } from './ui';

const OUTCOMES: Record<string, { label: string; tone: string }> = {
    Completed: { label: 'Done', tone: 'text-good' },
    AwaitingConfirmation: { label: 'Needs confirming', tone: 'text-warn' },
    Refused: { label: 'Not allowed', tone: 'text-bad' },
    Failed: { label: 'Did not go through', tone: 'text-bad' },
    BindFailed: { label: 'Check the arguments', tone: 'text-bad' },
};

/**
 * What a command the panel ran answered: its outcome, its lines, and Confirm when it waits for
 * one (a ban of many, a shutdown), which runs <c>:confirm</c> as you.
 */
export const CommandAnswer = ({ response, onConfirm, busy }: { response: RunCommandResponse; onConfirm: () => void; busy: boolean }) => {
    const outcome = OUTCOMES[response.outcome ?? ''] ?? { label: response.outcome ?? 'Unknown', tone: 'text-muted' };

    return (
        <div role="status" className="flex flex-col gap-2 rounded-xl border border-line bg-canvas px-4 py-3">
            <span className={cx('font-mono text-[11px] font-medium tracking-[0.08em] uppercase', outcome.tone)}>{outcome.label}</span>
            {response.lines.map((line, index) => <p key={index} className="font-mono text-[13px] whitespace-pre-wrap">{line.text}</p>)}
            {response.outcome === 'AwaitingConfirmation' && (
                <Button variant="danger" onClick={onConfirm} disabled={busy} className="self-start">Confirm</Button>
            )}
        </div>
    );
};
