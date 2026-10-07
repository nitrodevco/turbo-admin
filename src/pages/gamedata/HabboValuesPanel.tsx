import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { useHabboValuesPreview, useTakeHabboValues } from '#/api/gamedata';
import { Button, Checkbox, ErrorNotice, Panel, SuccessNotice, WarningNotice } from '#/components/ui';

import { FIELDS } from './fields';

/**
 * Habbo's values put back over the hotel's in the fields chosen, for every furniture Habbo has -
 * after a first import kept the hotel's server columns (can put stuff on, recyclable, ...), or
 * to undo edits made field by field. Each field shows how many definitions differ from Habbo.
 * It is one change set in the history, and rolls back as one.
 */
export const HabboValuesPanel = () => {
    const [ chosen, setChosen ] = useState<string[]>([]);
    const { data: preview, error, isFetching } = useHabboValuesPreview(chosen);
    const take = useTakeHabboValues();

    const toggle = (key: string, on: boolean) => setChosen(current => (on ? [ ...current, key ] : current.filter(x => x !== key)));
    const affected = chosen.length > 0 ? preview?.definitions ?? 0 : 0;

    return (
        <Panel
            title="Use Habbo's values"
            description={preview?.release
                ? `Replace the hotel's values with Habbo's (${preview.release.revision}) in the fields chosen, for every furniture Habbo has. The hotel's own furniture is left alone.`
                : 'Replace the hotel’s values with Habbo’s newest release in the fields chosen, for every furniture Habbo has.'}
            actions={(
                <Button
                    variant="secondary"
                    icon={<RotateCcw />}
                    disabled={take.isPending || isFetching || affected === 0}
                    onClick={() => {
                        if (window.confirm(`Use Habbo's ${chosen.join(', ')} on ${affected} furniture? It can be rolled back from the history.`))
                            take.mutate(chosen, { onSuccess: () => setChosen([]) });
                    }}
                >
                    {affected > 0 ? `Use Habbo's on ${affected.toLocaleString()}` : 'Use Habbo\'s'}
                </Button>
            )}
        >
            <div className="grid gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
                {FIELDS.map(field => (
                    <Checkbox
                        key={field.key}
                        label={(
                            <span>
                                {field.label}
                                {chosen.includes(field.key) && preview?.byField[field.key] !== undefined && (
                                    <span className="ml-1.5 font-mono text-xs text-muted">{preview.byField[field.key]!.toLocaleString()}</span>
                                )}
                            </span>
                        )}
                        checked={chosen.includes(field.key)}
                        onChange={on => toggle(field.key, on)}
                    />
                ))}
            </div>
            {preview && !preview.release && (
                <div className="border-t border-line p-4">
                    <WarningNotice>Habbo has not been checked yet, so there are no values of Habbo's to use. Check it on the overview.</WarningNotice>
                </div>
            )}
            {(error || take.error || take.data) && (
                <div className="border-t border-line p-4">
                    {error && <ErrorNotice error={error} />}
                    {take.error && <ErrorNotice error={take.error} />}
                    {take.data && <SuccessNotice>{take.data.changeSet ? take.data.changeSet.summary : 'Nothing to change: those fields already had Habbo\'s values.'}</SuccessNotice>}
                </div>
            )}
        </Panel>
    );
};
