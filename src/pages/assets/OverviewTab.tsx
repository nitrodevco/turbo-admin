import { AlertTriangle, ArrowRight, CheckCircle2, CloudDownload, XCircle } from 'lucide-react';
import { Link } from 'react-router';

import { type AssetCheck, type AssetJob, type AssetsStatus, BUNDLE_KINDS, useAssetChecks, useStartSync } from '#/api/bundles';
import { ask } from '#/components/confirm';
import { toastError } from '#/components/toast';
import { Badge, Button, EmptyState, ErrorNotice, Loading, Panel, Stat } from '#/components/ui';
import { cx } from '#/lib/cx';

import { formatBytes } from './format';
import { JobPanel } from './JobPanel';

const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;

/** Starts a sync, after saying what the first one takes. */
const SyncButton = ({ running }: { running: boolean }) => {
    const sync = useStartSync();

    return (
        <Button
            icon={<CloudDownload />}
            disabled={running || sync.isPending}
            onClick={() => ask(
                {
                    title: 'Sync the bundles from Habbo?',
                    body: 'Every library Habbo has that the hotel lacks, or has an older revision of, is downloaded and converted. The first sync takes the whole hotel: about 14,000 furniture libraries and several GB, which takes a while.',
                    confirm: 'Sync',
                },
                () => sync.mutate(undefined, { onError: toastError }),
            )}
        >
            Sync from Habbo
        </Button>
    );
};

/** One check: how many it found, what that means, and some of them; a link to the list it is about. */
const CheckCard = ({ check }: { check: AssetCheck }) => {
    const error = check.severity === 'error';
    const Icon = error ? XCircle : AlertTriangle;
    const list = check.kind && check.status ? `?tab=bundles&kind=${check.kind}&status=${check.status}` : null;

    return (
        <li className={cx('flex gap-3 rounded-xl border px-4 py-3', error ? 'border-bad-line bg-bad-soft/60' : 'border-warn-line bg-warn-soft/60')}>
            <Icon className={cx('mt-0.5 size-4 shrink-0', error ? 'text-bad' : 'text-warn')} aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium">{check.title}</span>
                    <Badge tone={error ? 'red' : 'amber'}>{check.count.toLocaleString()}</Badge>
                    {list && (
                        <Link to={list} className="ml-auto inline-flex min-h-8 items-center sm:min-h-0 gap-1 text-xs font-medium text-accent hover:underline [&>svg]:size-3.5">
                            Show them <ArrowRight />
                        </Link>
                    )}
                </div>
                <p className="text-[13px] text-muted">{check.detail}</p>
                {check.samples.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {check.samples.map(sample => (
                            <span key={sample} className="max-w-full truncate rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px]">{sample}</span>
                        ))}
                        {check.count > check.samples.length && (
                            <span className="px-1 py-0.5 font-mono text-[11px] text-muted">{`+${(check.count - check.samples.length).toLocaleString()} more`}</span>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
};

const Checks = () => {
    const { data, error } = useAssetChecks();
    const items = data ? [ ...data.items ].sort((a, b) => (a.severity === b.severity ? b.count - a.count : a.severity === 'error' ? -1 : 1)) : [];

    return (
        <Panel title="Checks" description="The bundles against the hotel's furniture, effects and pets.">
            {error && <div className="p-4"><ErrorNotice error={error} /></div>}
            {!data && !error && <Loading />}
            {data && items.length === 0 && (
                <p className="flex items-center gap-2 px-4 py-6 text-sm text-good"><CheckCircle2 className="size-4" /> Everything checks out.</p>
            )}
            {items.length > 0 && <ul className="flex flex-col gap-2 p-3 sm:p-4">{items.map(check => <CheckCard key={check.id} check={check} />)}</ul>}
        </Panel>
    );
};

/**
 * The bundles at a glance: how many of each kind and how large, the sync or publish running or
 * last run, and what the checks found.
 */
export const OverviewTab = ({ status, job }: { status: AssetsStatus; job: AssetJob | null }) => {
    const running = job?.status === 'running';
    const sync = status.canManage && !running ? <SyncButton running={running} /> : null;

    return (
        <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {BUNDLE_KINDS.map(({ value, label }) => {
                    const kind = status.kinds.find(x => x.kind === value);

                    return (
                        <Link key={value} to={`?tab=bundles&kind=${value}`} className="rounded-xl transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-accent">
                            <Stat
                                label={label}
                                value={(kind?.bundles ?? 0).toLocaleString()}
                                detail={(
                                    <>
                                        {formatBytes(kind?.bytes ?? 0)}
                                        {kind && kind.failed > 0 && <span className="text-bad">{` · ${kind.failed.toLocaleString()} failed`}</span>}
                                    </>
                                )}
                            />
                        </Link>
                    );
                })}
                <Stat
                    label="Checks"
                    tone={status.checks.errors > 0 ? 'bad' : status.checks.warnings > 0 ? 'warn' : undefined}
                    value={status.checks.errors + status.checks.warnings === 0 ? 'OK' : (status.checks.errors + status.checks.warnings).toLocaleString()}
                    detail={`${plural(status.checks.errors, 'error')} · ${plural(status.checks.warnings, 'warning')}`}
                />
            </div>

            {job
                ? <JobPanel job={job} canManage={status.canManage} actions={sync} />
                : (
                        <Panel title="Sync and publish" description={`Bundles are kept in ${status.directory}.`} actions={sync}>
                            <EmptyState>No sync or publish has run yet. A sync takes the bundles the hotel lacks from Habbo; the Publish tab sends them to where the client loads them.</EmptyState>
                        </Panel>
                    )}

            <Checks />
        </>
    );
};
