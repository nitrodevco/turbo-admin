import { IMPORT_PHASES, type ImportJob } from '#/api/gamedata';
import { Badge, ErrorNotice, SuccessNotice } from '#/components/ui';

/** The import running, or how the last one ended. */
export const JobProgress = ({ job }: { job: ImportJob }) => {
    const running = job.phase < 2;
    const share = job.filesTotal > 0 ? job.filesDone / job.filesTotal : 1;

    return (
        <div className="flex flex-col gap-2 p-4 text-sm">
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
