import { Download } from 'lucide-react';

import { FURNITURE_KINDS, type FurnitureImportItem, type GamedataStatus, IMPORT_ACTIONS, IMPORT_PHASES, type ImportJob, useImport, useImportJob, useImportPreview } from '#/api/gamedata';
import { PhoneLabel, Row, RowList } from '#/components/RowList';
import { Badge, type BadgeTone, Button, EmptyState, ErrorNotice, Loading, Panel, Stat, SuccessNotice, WarningNotice } from '#/components/ui';

import { showValue } from './labels';

const ACTION_TONES: Record<string, BadgeTone> = { add: 'green', update: 'accent', keep: 'amber' };

/** The fields an item's import touches: Habbo's new value, or the hotel's kept over it. */
const Fields = ({ item }: { item: FurnitureImportItem }) => {
    if (item.fields.length === 0)
        return <span className="text-muted">new definition, sprite {item.spriteId}</span>;

    return (
        <ul className="flex flex-col gap-0.5 font-mono text-xs">
            {item.fields.map(field => (
                <li key={field.field} className={field.kept ? 'text-warn' : undefined}>
                    {field.field}: {showValue(field.current)} {field.kept ? '(kept; Habbo has ' : '→ '}{showValue(field.incoming)}{field.kept ? ')' : ''}
                </li>
            ))}
        </ul>
    );
};

/** The import running, or how the last one ended. */
const JobProgress = ({ job }: { job: ImportJob }) => {
    const running = job.phase < 2;
    const share = job.filesTotal > 0 ? job.filesDone / job.filesTotal : 1;

    return (
        <div className="flex flex-col gap-2 border-b border-line p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
                <Badge tone={job.phase === 3 ? 'red' : running ? 'accent' : 'green'}>{IMPORT_PHASES[job.phase] ?? job.phase}</Badge>
                <span>Habbo {job.revision}</span>
                {job.filesTotal > 0 && (
                    <span className="font-mono text-xs text-muted">
                        {job.filesDone.toLocaleString()} / {job.filesTotal.toLocaleString()} files
                        {job.filesFailed > 0 && `, ${job.filesFailed.toLocaleString()} could not be read`}
                    </span>
                )}
            </div>
            {running && job.phase === 0 && (
                <div className="h-1.5 rounded-full bg-line" aria-hidden>
                    <div className="h-1.5 rounded-full bg-accent transition-[width]" style={{ width: `${Math.round(share * 100)}%` }} />
                </div>
            )}
            {job.phase === 2 && <SuccessNotice>{job.changeSet ? job.changeSet.summary : 'Nothing to change: the hotel had all of it.'}</SuccessNotice>}
            {job.phase === 3 && <ErrorNotice error={new Error(job.error ?? 'It failed.')} />}
        </div>
    );
};

/**
 * What taking in Habbo's newest release would do, before it is done: furniture added, fields
 * updated, and fields the hotel changed itself, which keep the hotel's value.
 */
export const ImportTab = ({ status }: { status: GamedataStatus }) => {
    const release = status.latestRelease;
    const { data: preview, error, isFetching } = useImportPreview(release !== null);
    const importRelease = useImport();
    const { data: jobData } = useImportJob();
    const job = jobData?.job ?? null;
    const running = job !== null && job.phase < 2;

    if (!release)
        return <Panel><EmptyState>Habbo has not been checked yet. Check it on the overview.</EmptyState></Panel>;

    if (error)
        return <ErrorNotice error={error} />;

    if (!preview)
        return <Loading />;

    const touched = preview.added + preview.updated + preview.kept;

    return (
        <>
            <div className="grid gap-3 sm:grid-cols-5">
                <Stat label="Added" value={preview.added.toLocaleString()} />
                <Stat label="Updated" value={preview.updated.toLocaleString()} />
                <Stat label="Kept as the hotel has them" value={preview.kept.toLocaleString()} tone={preview.kept ? 'warn' : undefined} />
                <Stat label="Unchanged" value={preview.unchanged.toLocaleString()} />
                <Stat label="Furniture files to read" value={preview.filesToRead.toLocaleString()} detail="For their states" />
            </div>

            <Panel
                title={`Habbo ${preview.release.revision}`}
                description={release.importedAt ? 'Taken in already. Anything listed changed since, here or at Habbo.' : 'Not taken in yet.'}
                actions={status.canManage && (
                    <Button
                        icon={<Download />}
                        disabled={importRelease.isPending || isFetching || running || (touched === 0 && preview.filesToRead === 0)}
                        onClick={() => {
                            if (window.confirm(`Take in Habbo ${preview.release.revision}? ${preview.filesToRead} furniture files are read first, then ${preview.added} furniture are added and ${preview.updated} updated. It runs in the background and can be rolled back from the history.`))
                                importRelease.mutate(preview.release.id);
                        }}
                    >
                        {running ? 'Taking in' : 'Take in'}
                    </Button>
                )}
            >
                {importRelease.error && <div className="p-4"><ErrorNotice error={importRelease.error} /></div>}
                {job && <JobProgress job={job} />}
                {preview.truncated && <div className="p-4"><WarningNotice>Only the first {preview.items.length} of {touched.toLocaleString()} items are listed.</WarningNotice></div>}
                {preview.items.length === 0
                    ? <EmptyState>Nothing to take in: the hotel's furniture is as this release has it.</EmptyState>
                    : (
                            <RowList
                                columns="minmax(10rem,1fr) 5rem 6rem minmax(14rem,2fr)"
                                headers={[ { label: 'Furniture' }, { label: 'Kind' }, { label: 'Change' }, { label: 'Fields' } ]}
                            >
                                {preview.items.map((item) => {
                                    const action = IMPORT_ACTIONS[item.action] ?? String(item.action);

                                    return (
                                        <Row key={`${item.productType}:${item.className}`}>
                                            <span className="truncate font-medium">{item.className}</span>
                                            <span><PhoneLabel>Kind </PhoneLabel>{FURNITURE_KINDS[item.productType] ?? item.productType}</span>
                                            <span><Badge tone={ACTION_TONES[action] ?? 'neutral'}>{action}</Badge></span>
                                            <Fields item={item} />
                                        </Row>
                                    );
                                })}
                            </RowList>
                        )}
            </Panel>
        </>
    );
};
