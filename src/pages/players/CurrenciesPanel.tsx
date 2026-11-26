import { Minus, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { type PlayerDetailResponse, usePlayerAbilities } from '#/api/players';
import { AddRow, Button, EmptyState, Input, Label, Panel, Select } from '#/components/ui';

import type { PlayerAction } from './usePlayerAction';

/**
 * A player's balances, a tile each, and under them giving or taking an amount of one when you may
 * (`:give`, run as you; a negative amount takes). What it did is told at the top of the page, with
 * the other actions'.
 */
export const CurrenciesPanel = ({ player, action }: { player: PlayerDetailResponse; action: PlayerAction }) => {
    const canGive = usePlayerAbilities().data?.give ?? false;
    const [ chosen, setChosen ] = useState(player.currencies[0]?.name ?? '');
    const [ amount, setAmount ] = useState('');
    const value = Math.trunc(Number(amount));
    const valid = chosen !== '' && amount !== '' && value > 0;

    const change = (sign: 1 | -1) => action.run(
        { action: 'give', currency: chosen, amount: sign * value },
        sign < 0 ? { title: `Take ${value.toLocaleString()} ${chosen} from ${player.name}?`, confirm: 'Take' } : undefined,
        () => setAmount(''),
    );

    const give = (event: FormEvent) => {
        event.preventDefault();

        if (valid)
            change(1);
    };

    return (
        <Panel title="Currencies">
            {player.currencies.length === 0
                ? <EmptyState>No balances yet.</EmptyState>
                : (
                    // As wide as the card between them; each ruled on its right and bottom, the outer edges clipped.
                        <div className="overflow-hidden">
                            <dl className="-mr-px -mb-px grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
                                {player.currencies.map(currency => (
                                    <div key={currency.typeId} className="border-r border-b border-line px-4 py-3">
                                        <dt><Label>{currency.name}</Label></dt>
                                        <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{currency.amount.toLocaleString()}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    )}
            {canGive && player.currencies.length > 0 && (
                <AddRow onSubmit={give}>
                    {player.currencies.length > 1 && (
                        <Select value={chosen} onChange={event => setChosen(event.target.value)} aria-label="Currency" className="min-w-0 max-sm:flex-[1_1_8rem] sm:w-40">
                            {player.currencies.map(currency => <option key={currency.typeId} value={currency.name}>{currency.name}</option>)}
                        </Select>
                    )}
                    <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={amount}
                        onChange={event => setAmount(event.target.value)}
                        placeholder="Amount"
                        aria-label={`Amount of ${chosen}`}
                        className="min-w-0 font-mono max-sm:flex-[1_1_7rem] sm:w-32"
                    />
                    <Button type="submit" variant="secondary" icon={<Plus />} disabled={action.busy || !valid}>Give</Button>
                    <Button variant="ghost" icon={<Minus />} disabled={action.busy || !valid} onClick={() => change(-1)}>Take</Button>
                </AddRow>
            )}
        </Panel>
    );
};
