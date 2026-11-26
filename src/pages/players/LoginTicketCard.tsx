import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { type IssuedTicket, issueTicket, revokeTicket, useTicketStatus } from '#/api/players';
import { ask } from '#/components/confirm';
import { Button, CopyButton, ErrorNotice, Label, Labeled, Panel, Select, Switch, WarningNotice } from '#/components/ui';
import { cx } from '#/lib/cx';
import { formatDateTime } from '#/lib/time';

const LIFETIMES = [
    { value: '15', label: '15 min' },
    { value: '60', label: '1 hour' },
    { value: '1440', label: '1 day' },
    { value: '10080', label: '7 days' },
    { value: 'never', label: 'Never' },
];

/** What a ticket shows as until it is asked for: the same however long the ticket is. */
const MASK = '••••••-••••••';

/**
 * A value shown once, the ticket in it hidden behind `MASK` until Show is pressed (a login link
 * keeps the rest of its address in sight), with a button that copies it whole either way.
 */
const Secret = ({ label, value, ticket }: { label: string; value: string; ticket: string }) => {
    const [ shown, setShown ] = useState(false);
    const name = label.toLowerCase();

    return (
        <div className="flex flex-col gap-1">
            <Label>{label}</Label>
            <div className="flex items-start gap-2">
                <code className={cx('min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs break-all', shown && 'select-all')}>
                    {shown ? value : value.includes(ticket) ? value.replaceAll(ticket, MASK) : MASK}
                </code>
                <Button variant="secondary" icon={shown ? <EyeOff /> : <Eye />} aria-label={shown ? `Hide the ${name}` : `Show the ${name}`} title={shown ? `Hide the ${name}` : `Show the ${name}`} aria-pressed={shown} onClick={() => setShown(!shown)} className="shrink-0" />
                <CopyButton text={value} label={`Copy the ${name}`} className="shrink-0" />
            </div>
        </div>
    );
};

/**
 * A player's login ticket: whether they have one and until when, and issuing a new one, which
 * replaces it. A ticket is shown once, when issued, and hidden until asked for even then; nothing
 * shows it again. It logs in as the
 * player, so the server only issues one for a player whose every permission you hold.
 */
export const LoginTicketCard = ({ playerId, playerName }: { playerId: number; playerName: string }) => {
    const queryClient = useQueryClient();
    const status = useTicketStatus(playerId, true);
    const [ lifetime, setLifetime ] = useState('60');
    const [ reusable, setReusable ] = useState(false);
    const [ issued, setIssued ] = useState<IssuedTicket | null>(null);
    const refresh = () => void queryClient.invalidateQueries({ queryKey: [ 'player', playerId, 'ticket' ] });

    const issue = useMutation({
        mutationFn: () => issueTicket(playerId, lifetime === 'never' ? null : Number(lifetime), reusable),
        onSuccess: setIssued,
        onSettled: refresh,
    });
    const revoke = useMutation({
        mutationFn: () => revokeTicket(playerId),
        onSuccess: () => setIssued(null),
        onSettled: refresh,
    });

    const current = status.data;
    const standing = lifetime === 'never' && reusable;

    return (
        <Panel title="Login ticket" actions={<KeyRound className="size-4 text-muted" />}>
            <div className="flex flex-col gap-3 p-4">
                {status.error && <ErrorNotice error={status.error} />}
                {current && (
                    <p className="text-sm">
                        {!current.hasTicket
                            ? <span className="text-muted">No ticket.</span>
                            : current.expired
                                ? <span className="text-warn">Their ticket has run out.</span>
                                : (
                                        <>
                                            Has a {current.reusable ? 'reusable' : 'single-use'} ticket
                                            {current.expiresAtUtc ? `, working until ${formatDateTime(current.expiresAtUtc)}` : ' that never runs out'}.
                                        </>
                                    )}
                    </p>
                )}

                {issued
                    ? (
                            <>
                                <Secret label="Ticket" value={issued.ticket} ticket={issued.ticket} />
                                {issued.loginUrl && <Secret label="Login link" value={issued.loginUrl} ticket={issued.ticket} />}
                                <p className="text-xs text-muted">
                                    Shown this once. It logs in as {playerName}
                                    {issued.reusable ? ', as often as it is used' : ', once'}
                                    {issued.expiresAtUtc ? `, until ${formatDateTime(issued.expiresAtUtc)}` : ', with no end'}.
                                </p>
                                <Button variant="ghost" onClick={() => setIssued(null)} className="self-start">Done</Button>
                            </>
                        )
                    : (
                            <>
                                <Labeled label="Works for">
                                    <Select value={lifetime} onChange={event => setLifetime(event.target.value)}>
                                        {LIFETIMES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                                    </Select>
                                </Labeled>
                                <Switch label="Can be used more than once" checked={reusable} onChange={setReusable} />
                                {standing && (
                                    <WarningNotice>
                                        A reusable ticket that never runs out logs in as {playerName} until it is taken away. Keep it as safe as a password.
                                    </WarningNotice>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        icon={<KeyRound />}
                                        disabled={issue.isPending}
                                        onClick={() => {
                                            if (current?.hasTicket)
                                                ask({ title: 'Issue a new ticket?', body: `${playerName}'s ticket stops working.`, confirm: 'Issue a new one', danger: true }, () => issue.mutate());
                                            else
                                                issue.mutate();
                                        }}
                                    >
                                        {current?.hasTicket ? 'Issue a new ticket' : 'Issue a ticket'}
                                    </Button>
                                    {current?.hasTicket && (
                                        <Button
                                            variant="ghost"
                                            icon={<Trash2 />}
                                            disabled={revoke.isPending}
                                            onClick={() => ask({ title: `Take ${playerName}'s ticket away?`, body: 'It stops working at once.', confirm: 'Take it away' }, () => revoke.mutate())}
                                        >
                                            Take it away
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                {(issue.error ?? revoke.error) && <ErrorNotice error={issue.error ?? revoke.error} />}
            </div>
        </Panel>
    );
};
