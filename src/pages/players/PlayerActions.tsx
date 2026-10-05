import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Coins, Gavel, MessageSquareWarning, MicOff, Repeat2, Unplug } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

import { post } from '#/api/client';
import { actOnPlayer, type PlayerActionRequest, type PlayerDetailResponse, usePlayerAbilities } from '#/api/players';
import type { RunCommandResponse } from '#/api/types';
import { CommandAnswer } from '#/components/CommandAnswer';
import { type Tab, TabbedPanel } from '#/components/TabbedPanel';
import { Button, ErrorNotice, Input, Label, Labeled, Segmented, Select, Textarea } from '#/components/ui';

const BAN_DURATIONS = [
    { value: '1h', label: '1 hour' },
    { value: '1d', label: '1 day' },
    { value: '7d', label: '7 days' },
    { value: 'perm', label: 'For good' },
];

const SILENCE_DURATIONS = [
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

/** One action's block in a tab: its name, what it does, its controls. */
const Block = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="flex flex-col gap-2.5 border-t border-line px-4 py-4 first:border-t-0">
        <Label>{title}</Label>
        {children}
    </div>
);

/**
 * What staff may do to a player from their page: send them a message, ban, silence or trade lock
 * them (and lift each), disconnect them, and change their balances. Each is the hotel's own
 * command, run as the staff member, so the same permissions and the command log apply, and a
 * player who outranks them is refused by the command itself. Only what they may do is shown.
 */
export const PlayerActions = ({ player }: { player: PlayerDetailResponse }) => {
    const { data: can } = usePlayerAbilities();
    const queryClient = useQueryClient();
    const [ message, setMessage ] = useState('');
    const [ messageKind, setMessageKind ] = useState<'warn' | 'alert'>('warn');
    const [ banFor, setBanFor ] = useState('1d');
    const [ banReason, setBanReason ] = useState('');
    const [ silenceFor, setSilenceFor ] = useState('1h');
    const [ lockFor, setLockFor ] = useState('7d');
    const [ currency, setCurrency ] = useState(player.currencies[0]?.name ?? 'credits');
    const [ amount, setAmount ] = useState('');

    const act = useMutation({
        mutationFn: (run: () => Promise<RunCommandResponse>) => run(),
        onSettled: () => void queryClient.invalidateQueries({ queryKey: [ 'player', player.id ] }),
    });

    if (!can)
        return null;

    const run = (request: PlayerActionRequest, confirm?: string) => {
        if (confirm && !window.confirm(confirm))
            return;

        act.mutate(() => actOnPlayer(player.id, request));
    };

    const confirmPending = () => act.mutate(() => post<RunCommandResponse>('/commands/run', { line: 'confirm' }));

    const sendMessage = (event: FormEvent) => {
        event.preventDefault();
        run({ action: messageKind, reason: message.trim() });
        setMessage('');
    };

    const tabs: Tab[] = [];

    if (can.warn || can.alert)
        tabs.push({
            id: 'message',
            label: 'Message',
            content: (
                <form onSubmit={sendMessage}>
                    <Block title="Send a message">
                        {can.warn && can.alert && (
                            <Segmented
                                label="Kind of message"
                                value={messageKind}
                                onChange={value => setMessageKind(value as 'warn' | 'alert')}
                                options={[ { value: 'warn', label: 'Moderator warning' }, { value: 'alert', label: 'Pop-up' } ]}
                            />
                        )}
                        <Textarea value={message} onChange={event => setMessage(event.target.value)} rows={3} placeholder={`What ${player.name} should read`} aria-label="Message" />
                        <Button type="submit" variant="secondary" icon={<MessageSquareWarning />} disabled={act.isPending || message.trim() === ''} className="self-start">
                            Send
                        </Button>
                    </Block>
                </form>
            ),
        });

    if (can.ban || can.unban || can.silence || can.tradelock)
        tabs.push({
            id: 'sanctions',
            label: 'Sanctions',
            content: (
                <>
                    {(can.ban || can.unban) && (
                        <Block title="Ban from the hotel">
                            {can.ban && (
                                <>
                                    <Segmented label="How long to ban" value={banFor} onChange={setBanFor} options={BAN_DURATIONS} />
                                    <Labeled label="Reason">
                                        <Input value={banReason} onChange={event => setBanReason(event.target.value)} placeholder="Shown to them, and kept with the ban" />
                                    </Labeled>
                                </>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {can.ban && (
                                    <Button
                                        variant="danger"
                                        icon={<Gavel />}
                                        disabled={act.isPending}
                                        onClick={() => run({ action: 'ban', duration: banFor, reason: banReason.trim() || undefined }, `Ban ${player.name} from the hotel?`)}
                                    >
                                        Ban
                                    </Button>
                                )}
                                {can.unban && <Button variant="secondary" disabled={act.isPending} onClick={() => run({ action: 'unban' })}>Lift ban</Button>}
                            </div>
                        </Block>
                    )}
                    {can.silence && (
                        <Block title="Silence everywhere">
                            <Segmented label="How long to silence" value={silenceFor} onChange={setSilenceFor} options={SILENCE_DURATIONS} />
                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" icon={<MicOff />} disabled={act.isPending} onClick={() => run({ action: 'silence', duration: silenceFor })}>Silence</Button>
                                <Button variant="ghost" disabled={act.isPending} onClick={() => run({ action: 'unsilence' })}>Unsilence</Button>
                            </div>
                        </Block>
                    )}
                    {can.tradelock && (
                        <Block title="Trade lock">
                            <Segmented label="How long to lock trading" value={lockFor} onChange={setLockFor} options={TRADELOCK_DURATIONS} />
                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" icon={<Repeat2 />} disabled={act.isPending} onClick={() => run({ action: 'tradelock', duration: lockFor })}>Lock trading</Button>
                                <Button variant="ghost" disabled={act.isPending} onClick={() => run({ action: 'untradelock' })}>Unlock</Button>
                            </div>
                        </Block>
                    )}
                </>
            ),
        });

    if (can.give && player.currencies.length > 0)
        tabs.push({
            id: 'wallet',
            label: 'Wallet',
            content: (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        run({ action: 'give', currency, amount: Number(amount) }, Number(amount) < 0 ? `Take ${-Number(amount)} ${currency} from ${player.name}?` : undefined);
                        setAmount('');
                    }}
                >
                    <Block title="Give or take">
                        <div className="flex flex-wrap gap-2">
                            <Select value={currency} onChange={event => setCurrency(event.target.value)} aria-label="Currency" className="flex-[1_1_8rem]">
                                {player.currencies.map(x => <option key={x.typeId} value={x.name}>{x.name}</option>)}
                            </Select>
                            <Input
                                type="number"
                                value={amount}
                                onChange={event => setAmount(event.target.value)}
                                placeholder="Amount; negative takes"
                                aria-label="Amount"
                                className="flex-[1_1_8rem] font-mono"
                            />
                        </div>
                        <Button type="submit" variant="secondary" icon={<Coins />} disabled={act.isPending || amount === '' || Number(amount) === 0} className="self-start">
                            {Number(amount) < 0 ? 'Take' : 'Give'}
                        </Button>
                    </Block>
                </form>
            ),
        });

    if (tabs.length === 0 && !(can.disconnect && player.isOnline))
        return null;

    return (
        <div className="flex flex-col gap-3">
            {tabs.length > 0 && <TabbedPanel tabs={tabs} />}
            {can.disconnect && player.isOnline && (
                <Button
                    variant="danger"
                    icon={<Unplug />}
                    disabled={act.isPending}
                    onClick={() => run({ action: 'disconnect' }, `Close ${player.name}'s connection?`)}
                >
                    Disconnect
                </Button>
            )}
            {act.error && <ErrorNotice error={act.error} />}
            {act.data && <CommandAnswer response={act.data} onConfirm={confirmPending} busy={act.isPending} />}
            <p className="flex items-center gap-1.5 text-xs text-muted [&>svg]:size-3.5">
                <Ban />
                Each action is the hotel&apos;s own command, run as you and kept in the command log.
            </p>
        </div>
    );
};
