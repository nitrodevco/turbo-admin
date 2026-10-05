import { useMutation } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { createPlayer, type NewPlayerRequest } from '#/api/players';
import { Button, ErrorNotice, Field, Labeled, Panel, Segmented } from '#/components/ui';

const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
];

/**
 * Making a new player: a name the hotel accepts (3 to 15 letters, digits and - = ? ! @ : . , _,
 * no spaces, not starting with @, and nobody else's whatever its case), a motto, a gender, and a
 * figure, or the gender's default. Their page opens once they exist, to give them a ticket.
 */
export const NewPlayerPanel = ({ onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();
    const [ draft, setDraft ] = useState<NewPlayerRequest>({ name: '', motto: '', gender: 'male', figure: '' });
    const create = useMutation({
        mutationFn: () => createPlayer(draft),
        onSuccess: created => navigate(`/players/${created.id}`),
    });

    const set = <K extends keyof NewPlayerRequest>(key: K, value: NewPlayerRequest[K]) => setDraft({ ...draft, [key]: value });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        create.mutate();
    };

    return (
        <Panel title="New player" description="They can log in once you give them a login ticket on their page.">
            <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-2">
                <Field
                    label="Name"
                    name="new-player-name"
                    value={draft.name}
                    onChange={event => set('name', event.target.value)}
                    minLength={3}
                    maxLength={15}
                    hint="3 to 15 letters, digits and - = ? ! @ : . , _ — no spaces."
                    required
                    autoComplete="off"
                    spellCheck={false}
                />
                <Field label="Motto" name="new-player-motto" value={draft.motto} onChange={event => set('motto', event.target.value)} maxLength={38} />
                <Labeled label="Gender">
                    <Segmented label="Gender" value={draft.gender} onChange={value => set('gender', value as NewPlayerRequest['gender'])} options={GENDERS} />
                </Labeled>
                <Field
                    label="Figure"
                    name="new-player-figure"
                    value={draft.figure}
                    onChange={event => set('figure', event.target.value)}
                    maxLength={279}
                    hint="Empty: the gender's default look."
                    spellCheck={false}
                    autoComplete="off"
                />
                {create.error && <div className="sm:col-span-2"><ErrorNotice error={create.error} /></div>}
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <Button type="submit" icon={<UserPlus />} disabled={create.isPending || draft.name.trim().length < 3}>Create player</Button>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                </div>
            </form>
        </Panel>
    );
};
