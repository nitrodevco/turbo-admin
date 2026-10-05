import { History, KeyRound, ListTree, Search, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import type { AuditEntry } from '#/api/permissions';
import { PhoneLabel, Row, RowList } from '#/components/RowList';
import type { TabItem } from '#/components/Tabs';
import { Badge, EmptyState, PageHeader, Select } from '#/components/ui';
import { formatDateTime } from '#/pages/rooms/labels';

import { DURATIONS, targetLink } from './links';

export type Section = 'groups' | 'players' | 'search' | 'log' | 'nodes';

const SECTIONS: TabItem[] = [
    { value: 'groups', label: 'Groups', icon: <ListTree />, to: '/permissions/groups' },
    { value: 'players', label: 'Players', icon: <Users />, to: '/permissions/players' },
    { value: 'search', label: 'Who has a node', icon: <Search />, to: '/permissions/search' },
    { value: 'log', label: 'Log', icon: <History />, to: '/permissions/log' },
    { value: 'nodes', label: 'Nodes', icon: <KeyRound />, to: '/permissions/nodes' },
];

/** The header every permissions page shares: its own title, and the section's tabs under it. */
export const PermissionsHeader = ({ section, title = 'Permissions', description, back, children }: {
    section: Section;
    title?: string;
    description?: ReactNode;
    back?: { to: string; label: string };
    children?: ReactNode;
}) => (
    <PageHeader
        title={title}
        description={description}
        back={back}
        tabs={{ items: SECTIONS, value: section }}
    >
        {children}
    </PageHeader>
);

/** When an assignment ends, or that it does not. */
export const Expiry = ({ at }: { at: string | null }) =>
    at ? <Badge tone="amber">until {formatDateTime(at)}</Badge> : null;

/** A node's value: granted or denied. */
export const Verdict = ({ value }: { value: boolean }) =>
    <Badge tone={value ? 'green' : 'red'}>{value ? 'grant' : 'deny'}</Badge>;

/** How long a new assignment lasts, and whether a running one is extended rather than replaced. */
export const TimingFields = ({ duration, extend, onDuration, onExtend }: {
    duration: string;
    extend: boolean;
    onDuration: (value: string) => void;
    onExtend: (value: boolean) => void;
}) => (
    <>
        <Select value={duration} onChange={event => onDuration(event.target.value)} aria-label="How long">
            {DURATIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
        {duration !== '' && (
            <label className="flex items-center gap-1.5 text-xs text-muted" title="Add the time to one already running, instead of replacing its end">
                <input type="checkbox" checked={extend} onChange={event => onExtend(event.target.checked)} className="accent-accent" />
                Extend
            </label>
        )}
    </>
);

const ACTIONS: Record<string, string> = {
    NodeSet: 'set node',
    NodeUnset: 'unset node',
    MetaSet: 'set meta',
    MetaUnset: 'unset meta',
    GroupAdded: 'added to group',
    GroupRemoved: 'removed from group',
    ParentAdded: 'added parent',
    ParentRemoved: 'removed parent',
    GroupCreated: 'created group',
    GroupDeleted: 'deleted group',
    GroupReweighted: 'reweighted',
    GroupRenamed: 'renamed',
    Expired: 'expired',
};

/** Permission changes, newest first: when, by whom, about whom, and what. */
export const AuditTable = ({ entries, showTarget = true }: { entries: AuditEntry[]; showTarget?: boolean }) =>
    entries.length === 0
        ? <EmptyState>No changes recorded.</EmptyState>
        : (
                <RowList
                    columns={showTarget ? 'max-content minmax(0,1fr) minmax(0,2fr) max-content' : 'max-content minmax(0,2fr) max-content'}
                    headers={[ { label: 'When' }, ...(showTarget ? [ { label: 'About' } ] : []), { label: 'Change' }, { label: 'By' } ]}
                >
                    {entries.map((entry, index) => (
                        <Row key={index}>
                            <span className="text-xs whitespace-nowrap text-muted sm:text-sm">{formatDateTime(entry.atUtc)}</span>
                            {showTarget && (
                                <span>
                                    <span className="mr-1.5 text-xs text-muted">{entry.targetType === 'Group' ? 'group' : 'player'}</span>
                                    <Link to={targetLink(entry.targetType, entry.targetId, entry.targetName)} className="font-medium hover:text-accent">
                                        {entry.targetName}
                                    </Link>
                                </span>
                            )}
                            <span className="basis-full wrap-anywhere sm:basis-auto">
                                <span className="text-muted">{ACTIONS[entry.action] ?? entry.action}</span>
                                {' '}
                                <code className="font-mono text-xs">{entry.subject}</code>
                                {entry.value !== null && (
                                    <>
                                        {' = '}
                                        <code className="font-mono text-xs">{entry.value}</code>
                                    </>
                                )}
                                {entry.expiresAtUtc && <span className="ml-2"><Expiry at={entry.expiresAtUtc} /></span>}
                            </span>
                            <span className="whitespace-nowrap">
                                <PhoneLabel>by </PhoneLabel>
                                {entry.actorId !== null
                                    ? <Link to={`/permissions/players/${entry.actorId}`} className="hover:text-accent">{entry.actorName}</Link>
                                    : <span className="text-muted">console</span>}
                            </span>
                        </Row>
                    ))}
                </RowList>
            );
