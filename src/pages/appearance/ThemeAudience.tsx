import { Users } from 'lucide-react';
import { useState } from 'react';

import { type ThemeAudience, type ThemeAudienceChange, type ThemeStatus, useSetThemeAudience } from '#/api/appearance';
import { HOTEL } from '#/appearance/workingOn';
import { Modal, ModalActions, ModalBody } from '#/components/Modal';
import { useSaved } from '#/components/SaveFeedback';
import { Button, Chip, ErrorNotice, FieldLabel, Input, Labeled, Segmented, Switch } from '#/components/ui';

import { STATUS_LABEL } from './themes';

/** A comma separated list as its trimmed entries. */
const listOf = (text: string) => text.split(',').map(x => x.trim()).filter(x => x.length > 0);

const STATUSES = (Object.keys(STATUS_LABEL) as ThemeStatus[]).map(status => ({ value: status, label: STATUS_LABEL[status] }));

/** What each status does, said under the choice. */
const STATUS_HINT: Record<ThemeStatus, string> = {
    live: 'Players draw it when it is the default, or when they chose it.',
    development: 'Only the players and groups below draw it, and staff who may preview themes.',
    off: 'No player draws it. Its files stay installed: turn the plugin off to unload them.',
};

/**
 * Who gets a theme (XenForo's style options), as one form: Live, In development or Off; while
 * Live, whether it is the hotel's default and whether players may choose it; while in development,
 * the players and permission groups that get it. Saved as one change. The hotel's own theme is
 * always Live (every theme ends in it), and so is the default, until another is made the default.
 */
export const ThemeAudienceDialog = ({ audience, name, groups, onClose }: { audience: ThemeAudience; name: string; groups: string[]; onClose: () => void }) => {
    const [ status, setStatus ] = useState(audience.status);
    const [ selectable, setSelectable ] = useState(audience.selectable);
    const [ makeDefault, setMakeDefault ] = useState(audience.isDefault);
    const [ players, setPlayers ] = useState(audience.players.map(x => x.name ?? String(x.id)).join(', '));
    const [ chosen, setChosen ] = useState(audience.groups);
    const set = useSetThemeAudience();
    const saved = useSaved();
    const fixed = audience.key === HOTEL
        ? 'The hotel\'s own theme is always Live: every theme ends in it.'
        : audience.isDefault ? 'The default theme stays Live: make another theme the default to change it.' : null;

    const save = () => {
        const change: ThemeAudienceChange = {
            status,
            ...(status === 'live' ? { selectable } : {}),
            ...(status === 'live' && makeDefault && !audience.isDefault ? { isDefault: true } : {}),
            ...(status === 'development' ? { players: listOf(players), groups: chosen } : {}),
        };

        set.mutate({ key: audience.key, change }, {
            onSuccess: () => {
                saved(`Saved who gets ${name}`);
                onClose();
            },
        });
    };

    return (
        <Modal title={`Who gets ${name}`} open onClose={onClose} className="sm:h-fit! sm:max-w-lg">
            <ModalBody
                data-theme-editor={audience.key}
                onSubmit={(event) => {
                    event.preventDefault();
                    save();
                }}
            >
                <div className="flex flex-col gap-1.5">
                    <FieldLabel>Status</FieldLabel>
                    <Segmented label="Status" value={status} onChange={value => setStatus(value as ThemeStatus)} options={STATUSES} disabled={!!fixed} />
                    <span className="text-xs text-muted">{fixed ?? STATUS_HINT[status]}</span>
                </div>
                {status === 'live' && (
                    <div className="flex flex-col divide-y divide-line rounded-lg border border-line px-3">
                        <Switch
                            label="The hotel's default"
                            hint={!audience.isDefault && 'Every player who chose no other theme draws it, in place of the default now.'}
                            checked={makeDefault}
                            disabled={audience.isDefault}
                            onChange={setMakeDefault}
                        />
                        <Switch label="Players may choose it" hint="In the client's settings, beside the default." checked={selectable} onChange={setSelectable} />
                    </div>
                )}
                {status === 'development' && (
                    <>
                        <Labeled label="Players" hint="Names, comma separated.">
                            <Input aria-label="Audience players" value={players} onChange={event => setPlayers(event.target.value)} placeholder="Name, Another name" />
                        </Labeled>
                        <div className="flex flex-col gap-1.5">
                            <FieldLabel id="audience-groups">Permission groups</FieldLabel>
                            {groups.length > 0
                                ? (
                                        <div role="group" aria-labelledby="audience-groups" className="flex flex-wrap gap-1.5">
                                            {groups.map(group => (
                                                <Chip key={group} active={chosen.includes(group)} onClick={() => setChosen(chosen.includes(group) ? chosen.filter(x => x !== group) : [ ...chosen, group ])}>
                                                    {group}
                                                </Chip>
                                            ))}
                                        </div>
                                    )
                                : <span className="text-xs text-muted">The hotel has no permission groups.</span>}
                        </div>
                        <p className="flex items-start gap-2 text-xs text-muted">
                            <Users className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            Staff with appearance.themes.preview may draw any theme in development too: in the client&apos;s Other settings, or with Preview as.
                        </p>
                    </>
                )}
                {set.error && <ErrorNotice error={set.error} />}
                <ModalActions>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={set.isPending}>{set.isPending ? 'Saving...' : 'Save'}</Button>
                </ModalActions>
            </ModalBody>
        </Modal>
    );
};
