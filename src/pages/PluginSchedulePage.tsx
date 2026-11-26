import { Play } from 'lucide-react';

import { type ScheduledTask, type ScheduledTaskOutcome, useRunScheduledTask, useScheduledTasks } from '#/api/schedule';
import { toast, toastError } from '#/components/toast';
import { Ago, Badge, type BadgeTone, Button, EmptyState, ErrorNotice, Loading, PageBody, PageHeader, Panel } from '#/components/ui';
import { useHubTabs } from '#/layout/nav';
import { formatDuration } from '#/lib/format';
import { plural } from '#/lib/plural';
import { formatDateTime, fromNow } from '#/lib/time';

const OUTCOMES: Record<ScheduledTaskOutcome, { label: string; tone: BadgeTone }> = {
    Succeeded: { label: 'ok', tone: 'green' },
    Failed: { label: 'failed', tone: 'red' },
    Cancelled: { label: 'cancelled', tone: 'amber' },
    Lost: { label: 'lost', tone: 'amber' },
};

/** One task: its schedule in words, its last and next run, and Run now for staff who manage plugins. */
const TaskRow = ({ task, canManage }: { task: ScheduledTask; canManage: boolean }) => {
    const run = useRunScheduledTask();

    return (
        <li className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-sm font-medium break-all">{task.key}</span>
                <span className="text-xs text-muted" title={task.schedule ?? undefined}>{task.description ?? task.schedule ?? 'Only on Run now'}</span>
                {task.runningSince && <Badge tone="accent">running</Badge>}
                {task.lastOutcome && <Badge tone={OUTCOMES[task.lastOutcome].tone}>{OUTCOMES[task.lastOutcome].label}</Badge>}
                {canManage && (
                    <Button
                        variant="secondary"
                        icon={<Play />}
                        className="ml-auto"
                        disabled={run.isPending || !!task.runningSince}
                        onClick={() => run.mutate(task.key, { onSuccess: result => toast(result.message), onError: toastError })}
                    >
                        Run now
                    </Button>
                )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span title={task.lastRunAt ? formatDateTime(task.lastRunAt) : undefined}>
                    Last run:
                    {' '}
                    {task.lastRunAt
                        ? `${fromNow(task.lastRunAt)}, ${formatDuration(task.lastDurationMs ?? 0)}${task.lastManual ? ' (run now)' : ''}`
                        : 'never'}
                </span>
                <span>
                    Next run:
                    {' '}
                    {task.nextRunAt ? <Ago at={task.nextRunAt} /> : 'none scheduled'}
                </span>
                {task.runningSince && <span>Running since <Ago at={task.runningSince} /></span>}
                {task.skipped > 0 && <span>{task.skipped.toLocaleString()} skipped (the run before was still going)</span>}
                {task.servers > 1 && <span>On {task.servers.toLocaleString()} servers, run on one</span>}
            </div>
            {task.scheduleError && <ErrorNotice error={new Error(`Its schedule can't be read, so it runs only on Run now: ${task.scheduleError}`)} />}
            {task.lastError && task.lastOutcome !== 'Succeeded' && <ErrorNotice error={new Error(task.lastError)} />}
        </li>
    );
};

/**
 * The Plugins page's Schedule tab: the plugins' scheduled tasks, each run once per cluster on its
 * schedule, never two runs at once. Run now (admin.plugins.manage) runs one at once without moving
 * its schedule, and goes to the command log.
 */
export const PluginSchedulePage = () => {
    const { data, error } = useScheduledTasks();
    const tabs = useHubTabs('plugins');

    return (
        <>
            <PageHeader title="Plugins" tabs={tabs} />
            <PageBody>
                {error && <ErrorNotice error={error} />}
                {!data && !error && <Loading />}
                {data && (
                    <Panel title="Schedule" description={`${plural(data.tasks.length, 'scheduled task')}.`} className="overflow-clip">
                        {data.tasks.length === 0 && <EmptyState>No loaded plugin has a scheduled task.</EmptyState>}
                        <ul className="divide-y divide-line">
                            {data.tasks.map(task => <TaskRow key={task.key} task={task} canManage={data.canManage} />)}
                        </ul>
                    </Panel>
                )}
            </PageBody>
        </>
    );
};
