import { Gavel, MessageSquareWarning, MicOff, Repeat2, Unplug } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

import { type PlayerDetailResponse, type PlayerRestriction, usePlayerAbilities } from '#/api/players';
import { Sheet } from '#/components/Sheet';
import { Button, Input, Label, Labeled, Panel, Segmented, Textarea } from '#/components/ui';
import { formatDateTime } from '#/lib/time';

import { activeBan, restrictionLabel } from './restrictions';
import type { PlayerAction } from './usePlayerAction';

const BAN_DURATIONS = [
    { value: '1h', label: '1 hour' },
    { value: '1d', label: '1 day' },
    { value: '7d', label: '7 days' },
    { value: 'perm', label: 'For good' },
];

const MUTE_DURATIONS = [
    { value: '10m', label: '10 min' },
    { value: '1h', label: '1 hour' },
    { value: '1d', label: '1 day' },
    { value: '7d', label: '7 days' },
];

const TRADELOCK_DURATIONS = [
    { value: '1d', label: '1 day' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'perm', label: 'For good' },
];

type Open = 'sanction' | 'mute' | 'tradelock' | null;

/** One part of a sheet: what it is, and its controls. */
const Block = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="flex flex-col gap-2.5 border-t border-line px-3 py-3 first:border-t-0">
        <Label>{title}</Label>
        {children}
    </div>
);

/** What holds now, at the top of its sheet: "Muted until 18 Oct 14:00". */
const Holds = ({ what, restriction }: { what: string; restriction: PlayerRestriction }) => (
    <p className="rounded-lg border border-warn-line bg-warn-soft px-3 py-2 text-sm text-warn">
        {what} {restriction.untilUtc ? `until ${formatDateTime(restriction.untilUtc)}` : 'for good'}.
    </p>
);

interface SheetProps {
    player: PlayerDetailResponse;
    action: PlayerAction;
    open: boolean;
    onClose: () => void;
}

/** Banning them from the hotel, or lifting the ban they have. */
const SanctionSheet = ({ player, action, open, onClose, ban, unban }: SheetProps & { ban: boolean; unban: boolean }) => {
    const [ duration, setDuration ] = useState('1d');
    const [ reason, setReason ] = useState('');
    const active = activeBan(player);

    return (
        <Sheet title={`Ban ${player.name}`} open={open} onClose={onClose}>
            {active && (
                <Block title="Banned now">
                    <Holds what="Banned" restriction={{ untilUtc: active.expiresUtc }} />
                    <p className="text-sm">{active.reason}</p>
                    {unban && (
                        <Button variant="secondary" disabled={action.busy} onClick={() => action.run({ action: 'unban' }, undefined, onClose)}>
                            Lift the ban
                        </Button>
                    )}
                </Block>
            )}
            {ban && (
                <Block title={active ? 'Ban again' : 'Ban from the hotel'}>
                    <Segmented label="How long to ban" value={duration} onChange={setDuration} options={BAN_DURATIONS} />
                    <Labeled label="Reason">
                        <Input value={reason} onChange={event => setReason(event.target.value)} placeholder="Shown to them, and kept with the ban" />
                    </Labeled>
                    <Button
                        variant="danger"
                        icon={<Gavel />}
                        disabled={action.busy}
                        onClick={() => action.run(
                            { action: 'ban', duration, reason: reason.trim() || undefined },
                            { title: `Ban ${player.name} from the hotel?`, body: player.isOnline ? 'They are disconnected at once.' : undefined, confirm: 'Ban' },
                            () => {
                                setReason('');
                                onClose();
                            },
                        )}
                    >
                        Ban {player.name}
                    </Button>
                </Block>
            )}
        </Sheet>
    );
};

/** A silence or a trade lock: for how long, or lifting the one that holds. */
const RestrictionSheet = ({ action, open, onClose, title, holds, restriction, durations, initial, start, startLabel, end, endLabel, icon }: Omit<SheetProps, 'player'> & {
    title: string;
    holds: string;
    restriction: PlayerRestriction | null;
    durations: { value: string; label: string }[];
    initial: string;
    start: 'silence' | 'tradelock';
    startLabel: string;
    end: 'unsilence' | 'untradelock';
    endLabel: string;
    icon: ReactNode;
}) => {
    const [ duration, setDuration ] = useState(initial);

    return (
        <Sheet title={title} open={open} onClose={onClose}>
            {restriction && (
                <Block title="Now">
                    <Holds what={holds} restriction={restriction} />
                    <Button variant="secondary" disabled={action.busy} onClick={() => action.run({ action: end }, undefined, onClose)}>{endLabel}</Button>
                </Block>
            )}
            <Block title={restriction ? 'Change how long' : 'How long'}>
                <Segmented label="How long" value={duration} onChange={setDuration} options={durations} />
                <Button icon={icon} disabled={action.busy} onClick={() => action.run({ action: start, duration }, undefined, onClose)}>{startLabel}</Button>
            </Block>
        </Sheet>
    );
};

/**
 * A mute or a trade lock as a row of the controls, as a room's switches are: what it is and
 * whether it holds now, and a button that opens its sheet (for how long, or lifting it).
 */
const RestrictionRow = ({ label, restriction, held, icon, busy, onOpen }: { label: string; restriction: PlayerRestriction | null; held: string; icon: ReactNode; busy: boolean; onOpen: () => void }) => (
    <div className="flex min-h-12 items-center justify-between gap-4 py-1.5">
        <span className="min-w-0">
            <span className="block text-sm">{label}</span>
            <span className={restriction ? 'block text-xs text-warn' : 'block text-xs text-muted'}>{restriction ? `${held}, ${restrictionLabel(restriction)}` : 'Not now'}</span>
        </span>
        <Button small variant="secondary" icon={icon} disabled={busy} onClick={onOpen}>{restriction ? 'Change' : label}</Button>
    </div>
);

/** A message for them, as a room's alert is for everyone in it: a moderator's warning or a plain pop-up. Only while they are online, as in the hotel. */
const AlertForm = ({ player, action, warn, alert }: { player: PlayerDetailResponse; action: PlayerAction; warn: boolean; alert: boolean }) => {
    const offline = !player.isOnline;

    const [ message, setMessage ] = useState('');
    const [ kind, setKind ] = useState<'warn' | 'alert'>(warn ? 'warn' : 'alert');

    const send = (event: FormEvent) => {
        event.preventDefault();
        action.run({ action: kind, reason: message.trim() }, undefined, () => setMessage(''));
    };

    return (
        <form onSubmit={send} className="flex flex-col gap-2 border-t border-line px-4 py-3 first:border-t-0">
            <Label>Alert</Label>
            {warn && alert && (
                <Segmented
                    label="Kind of message"
                    value={kind}
                    onChange={value => setKind(value as 'warn' | 'alert')}
                    options={[ { value: 'warn', label: 'Moderator warning' }, { value: 'alert', label: 'Pop-up' } ]}
                    disabled={offline}
                />
            )}
            <Textarea
                value={message}
                onChange={event => setMessage(event.target.value)}
                rows={2}
                placeholder={offline ? `${player.name} is offline: an alert needs them online` : kind === 'warn' ? `A warning from the moderators to ${player.name}` : `A pop-up for ${player.name}`}
                aria-label="Alert"
                disabled={offline}
            />
            <Button type="submit" variant="secondary" icon={<MessageSquareWarning />} disabled={action.busy || offline || message.trim() === ''}>Send alert</Button>
        </form>
    );
};

/**
 * What staff may do to a player, beside their page as a room's controls are beside the room's:
 * muting them and locking their trading (each row saying what holds), an alert, and in the danger
 * zone banning them (or lifting the ban) and closing their connection while they are online. Each
 * is the hotel's own command, run as the staff member, so the same permissions and the command log
 * apply, and a player who outranks them is refused by the command itself. Only what they may do is
 * shown; what each did is told at the top of the page.
 */
export const PlayerControls = ({ player, action }: { player: PlayerDetailResponse; action: PlayerAction }) => {
    const { data: can } = usePlayerAbilities();
    const [ open, setOpen ] = useState<Open>(null);
    const close = () => setOpen(null);

    if (!can)
        return null;

    const banned = activeBan(player);
    const bans = can.ban || (can.unban && !!banned);

    if (!can.silence && !can.tradelock && !can.warn && !can.alert && !bans && !can.disconnect)
        return null;

    return (
        <Panel title="Player controls">
            {(can.silence || can.tradelock) && (
                <div className="divide-y divide-line px-4">
                    {can.silence && <RestrictionRow label="Mute" held="Muted" restriction={player.silenced} icon={<MicOff />} busy={action.busy} onOpen={() => setOpen('mute')} />}
                    {can.tradelock && <RestrictionRow label="Trade lock" held="Locked" restriction={player.tradeLocked} icon={<Repeat2 />} busy={action.busy} onOpen={() => setOpen('tradelock')} />}
                </div>
            )}
            {(can.warn || can.alert) && <AlertForm key={player.id} player={player} action={action} warn={can.warn} alert={can.alert} />}
            {(bans || can.disconnect) && (
                <div className="flex flex-col gap-2 border-t border-line px-4 py-3 first:border-t-0">
                    <Label className="text-bad">Danger zone</Label>
                    {banned && <p className="text-xs text-bad">{`Banned, ${restrictionLabel({ untilUtc: banned.expiresUtc })}.`}</p>}
                    <div className="grid grid-cols-2 gap-2">
                        {bans && (
                            <Button variant="danger" icon={<Gavel />} disabled={action.busy} onClick={() => setOpen('sanction')}>
                                {banned ? 'Ban or lift' : 'Ban'}
                            </Button>
                        )}
                        {can.disconnect && (
                            <Button
                                variant="danger"
                                icon={<Unplug />}
                                disabled={action.busy || !player.isOnline}
                                onClick={() => action.run({ action: 'disconnect' }, { title: `Close ${player.name}'s connection?`, confirm: 'Disconnect', danger: true })}
                            >
                                Disconnect
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <SanctionSheet player={player} action={action} open={open === 'sanction'} onClose={close} ban={can.ban} unban={can.unban} />
            <RestrictionSheet
                action={action}
                open={open === 'mute'}
                onClose={close}
                title={`Mute ${player.name}`}
                holds="Muted everywhere"
                restriction={player.silenced}
                durations={MUTE_DURATIONS}
                initial="1h"
                start="silence"
                startLabel="Mute"
                end="unsilence"
                endLabel="Unmute"
                icon={<MicOff />}
            />
            <RestrictionSheet
                action={action}
                open={open === 'tradelock'}
                onClose={close}
                title={`Trade lock ${player.name}`}
                holds="Trading locked"
                restriction={player.tradeLocked}
                durations={TRADELOCK_DURATIONS}
                initial="7d"
                start="tradelock"
                startLabel="Lock trading"
                end="untradelock"
                endLabel="Unlock trading"
                icon={<Repeat2 />}
            />
        </Panel>
    );
};
