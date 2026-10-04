import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { groupCalls, useGroups, usePermissionChange } from '#/api/permissions';
import { Badge, Button, EmptyState, ErrorNotice, Field, Loading, PageBody, Panel, Td, Th } from '#/components/ui';

import { PermissionsHeader } from './common';

const NewGroup = ({ maxWeight }: { maxWeight: number }) => {
    const navigate = useNavigate();
    const create = usePermissionChange(groupCalls('').create);
    const [ name, setName ] = useState('');
    const [ displayName, setDisplayName ] = useState('');
    const [ weight, setWeight ] = useState('0');

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        const key = name.trim().toLowerCase();

        create.mutate([ { name: key, displayName: displayName.trim(), weight: Number(weight) } ], {
            onSuccess: () => navigate(`/permissions/groups/${encodeURIComponent(key)}`),
        });
    };

    return (
        <Panel title="New group" description={`Its weight must be below ${maxWeight}, your heaviest group's.`}>
            <form onSubmit={handleSubmit} className="space-y-3 p-4">
                {create.error && <ErrorNotice error={create.error} />}
                <Field
                    label="Name"
                    name="group-name"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="events_lead"
                    hint="The key, for good: lowercase letters, digits and _."
                    required
                />
                <Field label="Display name" name="group-display" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Events lead" />
                <Field
                    label="Weight"
                    name="group-weight"
                    type="number"
                    value={weight}
                    onChange={event => setWeight(event.target.value)}
                    max={maxWeight - 1}
                    hint="Higher wins when two groups disagree."
                    required
                />
                <Button type="submit" icon={<Plus />} disabled={create.isPending || name.trim() === ''}>Create group</Button>
            </form>
        </Panel>
    );
};

/** Every group, heaviest first, and making a new one. */
export const GroupsPage = () => {
    const { data, error, isPending } = useGroups();

    return (
        <>
            <PermissionsHeader
                section="groups"
                description={data ? `${data.groups.length} groups. Players reach a group directly or through its children.` : 'Groups and what they hold'}
            />
            <PageBody className="grid gap-5 xl:grid-cols-[1fr_20rem]">
                {error && <ErrorNotice error={error} />}
                {isPending && <Loading />}
                {data && (
                    <>
                        <Panel className="overflow-hidden">
                            {data.groups.length === 0
                                ? <EmptyState>There are no groups.</EmptyState>
                                : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr>
                                                        <Th>Group</Th>
                                                        <Th className="text-right">Weight</Th>
                                                        <Th>Inherits</Th>
                                                        <Th className="text-right">Nodes</Th>
                                                        <Th className="text-right">Meta</Th>
                                                    </tr>
                                                </thead>
                                                <tbody className="[&>tr:last-child>td]:border-b-0">
                                                    {data.groups.map(group => (
                                                        <tr key={group.id} className="hover:bg-subtle/60">
                                                            <Td>
                                                                <Link to={`/permissions/groups/${encodeURIComponent(group.name)}`} className="font-medium hover:text-accent">
                                                                    {group.displayName}
                                                                </Link>
                                                                <span className="ml-2 font-mono text-xs text-muted">{group.name}</span>
                                                                {data.canManage && !group.canEdit && <Badge className="ml-2">read-only</Badge>}
                                                            </Td>
                                                            <Td className="text-right tabular-nums">{group.weight}</Td>
                                                            <Td className="text-muted">{group.parents.join(', ') || '-'}</Td>
                                                            <Td className="text-right tabular-nums">{group.nodeCount}</Td>
                                                            <Td className="text-right tabular-nums">{group.metaCount}</Td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                        </Panel>
                        {data.canManage && data.yourWeight > 0 && <div><NewGroup maxWeight={data.yourWeight} /></div>}
                    </>
                )}
            </PageBody>
        </>
    );
};
