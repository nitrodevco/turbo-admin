import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, MessageSquareText, Power, Wrench } from 'lucide-react';
import { useState } from 'react';

import { post } from '#/api/client';
import { actOnHotel, type HotelActionRequest, saveWelcomeMessage, useHotelAbilities, useWelcomeMessage, type WelcomeMessage } from '#/api/queries';
import type { AvailabilityPhase, RunCommandResponse } from '#/api/types';
import { CommandAnswer } from '#/components/CommandAnswer';
import { ask, type Question } from '#/components/confirm';
import { type Tab, TabbedPanel } from '#/components/TabbedPanel';
import { Button, ErrorNotice, Input, Label, Labeled, Loading, Segmented, SuccessNotice, Textarea } from '#/components/ui';

const MAINTENANCE_MINUTES = [
    { value: '0', label: 'Now' },
    { value: '5', label: '5 min' },
    { value: '10', label: '10 min' },
    { value: '30', label: '30 min' },
];

const SHUTDOWN_MINUTES = [
    { value: '1', label: '1 min' },
    { value: '5', label: '5 min' },
    { value: '10', label: '10 min' },
    { value: '30', label: '30 min' },
];

/**
 * The message every player is shown when they log in. Saved for every login from now on; saving
 * it empty turns it off.
 */
const WelcomeMessageEditor = ({ saved }: { saved: WelcomeMessage }) => {
    const queryClient = useQueryClient();
    const [ draft, setDraft ] = useState(saved.message);

    const save = useMutation({
        mutationFn: (message: string) => saveWelcomeMessage(message),
        onSuccess: (data) => {
            queryClient.setQueryData([ 'welcome-message' ], data);
            setDraft(data.message);
        },
    });

    const changed = draft.trim() !== saved.message;

    return (
        <form
            className="flex flex-col gap-2.5 p-4"
            onSubmit={(event) => {
                event.preventDefault();
                save.mutate(draft);
            }}
        >
            <Label>Shown to every player when they log in</Label>
            <p className="text-xs text-muted">It opens as the message of the day. Leave it empty and no message is shown.</p>
            <Textarea
                value={draft}
                onChange={event => setDraft(event.target.value)}
                rows={4}
                maxLength={saved.maxLength}
                placeholder="No welcome message"
                aria-label="Welcome message"
            />
            <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="secondary" icon={<MessageSquareText />} disabled={save.isPending || !changed}>
                    {draft.trim() === '' ? 'Turn off' : 'Save'}
                </Button>
                <span className="text-xs text-muted">{draft.length} / {saved.maxLength}</span>
            </div>
            {save.error && <ErrorNotice error={save.error} />}
            {save.isSuccess && !changed && <SuccessNotice>{saved.message === '' ? 'No welcome message is shown now.' : 'Saved. Players see it at their next login.'}</SuccessNotice>}
        </form>
    );
};

const WelcomeMessageTab = () => {
    const { data, error } = useWelcomeMessage();

    if (error)
        return <div className="p-4"><ErrorNotice error={error} /></div>;

    return data ? <WelcomeMessageEditor saved={data} /> : <Loading />;
};

/**
 * The whole hotel's controls: a pop-up for everyone online, maintenance and shutdown, each with
 * its countdown and a way to call it off. Each is the hotel's own command, run as you: its node,
 * its confirmation and the command log, as typed in game. The welcome message shown at login is
 * set here too. Only what you may do is shown.
 */
export const HotelControls = ({ phase }: { phase: AvailabilityPhase }) => {
    const { data: can } = useHotelAbilities();
    const queryClient = useQueryClient();
    const [ alert, setAlert ] = useState('');
    const [ maintenanceIn, setMaintenanceIn ] = useState('10');
    const [ shutdownIn, setShutdownIn ] = useState('5');
    const [ reason, setReason ] = useState('');

    const act = useMutation({
        mutationFn: (run: () => Promise<RunCommandResponse>) => run(),
        onSettled: () => void queryClient.invalidateQueries({ queryKey: [ 'dashboard' ] }),
    });

    if (!can || (!can.alert && !can.maintenance && !can.shutdown && !can.welcomeMessage))
        return null;

    const run = (request: HotelActionRequest, question?: Question, then?: () => void) => {
        const go = () => {
            act.mutate(() => actOnHotel(request));
            then?.();
        };

        if (question)
            ask(question, go);
        else
            go();
    };

    const confirmPending = () => act.mutate(() => post<RunCommandResponse>('/commands/run', { line: 'confirm' }));
    const inMaintenance = phase === 'MaintenanceScheduled' || phase === 'Maintenance';
    const shuttingDown = phase === 'ShutdownScheduled';
    const tabs: Tab[] = [];

    if (can.alert)
        tabs.push({
            id: 'alert',
            label: 'Hotel alert',
            content: (
                <form
                    className="flex flex-col gap-2.5 p-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        run({ action: 'alert', message: alert.trim() }, { title: 'Send this to everyone online?', confirm: 'Send' }, () => setAlert(''));
                    }}
                >
                    <Label>A pop-up for everyone online</Label>
                    <Textarea value={alert} onChange={event => setAlert(event.target.value)} rows={3} placeholder="What everyone should read" aria-label="Hotel alert" />
                    <Button type="submit" variant="secondary" icon={<Megaphone />} disabled={act.isPending || alert.trim() === ''} className="self-start">Send to everyone</Button>
                </form>
            ),
        });

    if (can.maintenance)
        tabs.push({
            id: 'maintenance',
            label: 'Maintenance',
            content: (
                <div className="flex flex-col gap-2.5 p-4">
                    <Label>Count down to maintenance</Label>
                    <p className="text-xs text-muted">Players are reminded as it runs out, then everyone without the bypass is sent home and kept out until it ends.</p>
                    <Segmented label="Start maintenance in" value={maintenanceIn} onChange={setMaintenanceIn} options={MAINTENANCE_MINUTES} />
                    <Labeled label="Reason (optional)">
                        <Input value={reason} onChange={event => setReason(event.target.value)} placeholder="Shown to players" />
                    </Labeled>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="danger"
                            icon={<Wrench />}
                            disabled={act.isPending || shuttingDown}
                            onClick={() => run({ action: 'maintenance', minutes: Number(maintenanceIn), message: reason.trim() || undefined }, {
                                title: maintenanceIn === '0' ? 'Start maintenance now?' : `Start maintenance in ${maintenanceIn} min?`,
                                body: maintenanceIn === '0'
                                    ? 'Everyone without the bypass is sent home now and kept out until it ends.'
                                    : `Everyone without the bypass is sent home in ${maintenanceIn} min and kept out until it ends.`,
                                confirm: 'Start maintenance',
                                danger: true,
                            })}
                        >
                            {maintenanceIn === '0' ? 'Start maintenance now' : `Start in ${maintenanceIn} min`}
                        </Button>
                        {inMaintenance && <Button variant="secondary" disabled={act.isPending} onClick={() => run({ action: 'maintenance-off' })}>End maintenance</Button>}
                    </div>
                </div>
            ),
        });

    if (can.shutdown)
        tabs.push({
            id: 'shutdown',
            label: 'Shutdown',
            content: (
                <div className="flex flex-col gap-2.5 p-4">
                    <Label className="text-bad">Shut the hotel down</Label>
                    <p className="text-xs text-muted">Players are reminded as it runs out, then sent home, and the server stops so everything is saved. It does not start again by itself.</p>
                    <Segmented label="Shut down in" value={shutdownIn} onChange={setShutdownIn} options={SHUTDOWN_MINUTES} />
                    <Labeled label="Reason (optional)">
                        <Input value={reason} onChange={event => setReason(event.target.value)} placeholder="Shown to players" />
                    </Labeled>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="danger"
                            icon={<Power />}
                            disabled={act.isPending}
                            onClick={() => run({ action: 'shutdown', minutes: Number(shutdownIn), message: reason.trim() || undefined }, {
                                title: `Shut the hotel down in ${shutdownIn} min?`,
                                body: 'Everyone is sent home, and the server stops. It does not start again by itself.',
                                confirm: 'Shut down',
                            })}
                        >
                            {`Shut down in ${shutdownIn} min`}
                        </Button>
                        {shuttingDown && <Button variant="secondary" disabled={act.isPending} onClick={() => run({ action: 'shutdown-cancel' })}>Call it off</Button>}
                    </div>
                </div>
            ),
        });

    if (can.welcomeMessage)
        tabs.push({ id: 'welcome', label: 'Welcome message', content: <WelcomeMessageTab /> });

    return (
        <div className="flex flex-col gap-3">
            <TabbedPanel tabs={tabs} />
            {act.error && <ErrorNotice error={act.error} />}
            {act.data && <CommandAnswer response={act.data} onConfirm={confirmPending} busy={act.isPending} />}
        </div>
    );
};
