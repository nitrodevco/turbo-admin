import { Hammer, RefreshCw } from 'lucide-react';

import { type GamedataStatus, useCheckHabbo, useRebuild } from '#/api/gamedata';
import { Badge, Button, ErrorNotice, Kv, Panel, Stat, SuccessNotice } from '#/components/ui';
import { fromNow } from '#/lib/time';
import { formatDateTime } from '#/pages/rooms/labels';

import { formatSize } from './labels';

/**
 * What clients are sent now, and Habbo's newest release: whether it is taken in yet. Habbo is
 * checked on a schedule; checking here asks it now.
 */
export const OverviewTab = ({ status }: { status: GamedataStatus }) => {
    const check = useCheckHabbo();
    const rebuild = useRebuild();
    const release = status.latestRelease;
    const file = status.furnitureData;

    return (
        <>
            <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="FurnitureData" value={file.hash.slice(0, 10)} detail={`${formatSize(file.size)}, built ${fromNow(file.builtAt)}`} />
                <Stat label="Habbo revision" value={release ? release.revision.replace(/^PRODUCTION-/, '') : '-'} detail={release ? `${release.furnitureCount.toLocaleString()} furniture` : 'Not checked yet'} />
                <Stat
                    label="Habbo update"
                    value={!release ? '-' : release.importedAt ? 'Taken in' : 'Waiting'}
                    tone={release && !release.importedAt ? 'warn' : undefined}
                    detail={release?.importedAt ? fromNow(release.importedAt) : release ? 'Review it under Habbo update' : undefined}
                />
            </div>

            <Panel
                title="FurnitureData"
                description="Built from the furniture definitions whenever they or a published catalog change. Its address is the hash of its content."
                actions={status.canManage && (
                    <Button variant="secondary" icon={<Hammer />} disabled={rebuild.isPending} onClick={() => rebuild.mutate()}>
                        Rebuild
                    </Button>
                )}
            >
                <dl>
                    <Kv label="Current">/gamedata/furnidata_json/{file.hash}</Kv>
                    <Kv label="Always the latest">/gamedata/furnidata_json/0</Kv>
                    <Kv label="Built">{formatDateTime(file.builtAt)}</Kv>
                </dl>
                <div className="flex flex-col gap-2 border-t border-line p-4 text-sm">
                    <p className="text-xs text-muted">
                        Point the client's <code>furnituredata.url</code> at <code>/gamedata/furnidata_json/0</code> on the gamedata host. It redirects to the current hash, which browsers keep for good.
                    </p>
                    {rebuild.error && <ErrorNotice error={rebuild.error} />}
                    {rebuild.data && <SuccessNotice>Built {rebuild.data.hash.slice(0, 10)}.</SuccessNotice>}
                </div>
            </Panel>

            <Panel
                title="Habbo"
                description="Habbo's external variables and furniture data, checked on a schedule. A new release waits here until it is reviewed and taken in."
                actions={status.canManage && (
                    <Button variant="secondary" icon={<RefreshCw />} disabled={check.isPending} onClick={() => check.mutate()}>
                        {check.isPending ? 'Checking' : 'Check now'}
                    </Button>
                )}
            >
                {release
                    ? (
                            <dl>
                                <Kv label="Hotel">habbo.{release.domain}</Kv>
                                <Kv label="Revision">{release.revision}</Kv>
                                <Kv label="Found">{formatDateTime(release.foundAt)}</Kv>
                                <Kv label="Last checked">{fromNow(release.checkedAt)}</Kv>
                                <Kv label="Taken in">{release.importedAt ? formatDateTime(release.importedAt) : <Badge tone="amber">not yet</Badge>}</Kv>
                            </dl>
                        )
                    : <p className="p-4 text-sm text-muted">Habbo has not been checked yet.</p>}
                {(check.error || check.data) && (
                    <div className="border-t border-line p-4">
                        {check.error && <ErrorNotice error={check.error} />}
                        {check.data && <SuccessNotice>{check.data.isNew ? `New release found: ${check.data.release.revision}.` : 'Nothing new: Habbo serves the furniture already found.'}</SuccessNotice>}
                    </div>
                )}
            </Panel>
        </>
    );
};
