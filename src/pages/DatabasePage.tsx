import { DatabaseBackup, Download, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { type DatabaseBackup as Backup, type DatabaseTable, downloadDatabaseBackup, useBuildDatabaseBackup, useDatabaseBackups, useDatabaseTables, useDeleteDatabaseBackup } from '#/api/database';
import { ask } from '#/components/confirm';
import { SearchInput } from '#/components/SearchInput';
import { toast, toastError } from '#/components/toast';
import { Button, CHECK_CLASS, EmptyState, ErrorNotice, IconButton, Loading, PageBody, PageHeader, Panel, TextButton, WarningNotice } from '#/components/ui';
import { formatBytes } from '#/lib/format';
import { plural } from '#/lib/plural';
import { formatDateTime } from '#/lib/time';

/** A table's rows as the database says them: MySQL's are its estimate. */
const rowsOf = (table: DatabaseTable) => `${table.rowsEstimated ? '≈ ' : ''}${table.rows.toLocaleString()}`;

/**
 * The database's tables to choose from, with a filter by name. Choosing what the filter shows
 * adds to what is chosen already, so a backup can be put together from several searches.
 */
const TablePicker = ({ tables, chosen, onChange, disabled }: { tables: DatabaseTable[]; chosen: ReadonlySet<string>; onChange: (chosen: Set<string>) => void; disabled: boolean }) => {
    const [ filter, setFilter ] = useState('');
    const needle = filter.trim().toLowerCase();
    const shown = useMemo(() => (needle === '' ? tables : tables.filter(table => table.name.toLowerCase().includes(needle))), [ tables, needle ]);
    const allShownChosen = shown.length > 0 && shown.every(table => chosen.has(table.name));

    const toggle = (name: string, on: boolean) => {
        const next = new Set(chosen);

        if (on)
            next.add(name);
        else
            next.delete(name);

        onChange(next);
    };

    const toggleShown = () => {
        const next = new Set(chosen);

        for (const table of shown) {
            if (allShownChosen)
                next.delete(table.name);
            else
                next.add(table.name);
        }

        onChange(next);
    };

    return (
        <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3">
                <SearchInput value={filter} onValueChange={setFilter} placeholder="Find a table" className="w-full sm:max-w-xs" />
                {/* With every table chosen and none filtered out, Clear all below says it. */}
                {!(allShownChosen && needle === '') && (
                    <TextButton onClick={toggleShown} disabled={disabled || shown.length === 0}>
                        {allShownChosen ? 'Clear' : 'Choose'} {needle === '' ? 'all' : `the ${plural(shown.length, 'table')} found`}
                    </TextButton>
                )}
                {chosen.size > 0 && (
                    <TextButton onClick={() => onChange(new Set())} disabled={disabled}>
                        Clear all
                    </TextButton>
                )}
            </div>
            {shown.length === 0 && <EmptyState>No table is named like that.</EmptyState>}
            {shown.length > 0 && (
                <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
                    {shown.map(table => (
                        <li key={table.name}>
                            <label className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-subtle/60 has-[:disabled]:cursor-default">
                                <input
                                    type="checkbox"
                                    className={CHECK_CLASS}
                                    checked={chosen.has(table.name)}
                                    disabled={disabled}
                                    onChange={event => toggle(table.name, event.target.checked)}
                                />
                                <span className="min-w-0 flex-1 truncate font-mono text-ui">{table.name}</span>
                                <span className="shrink-0 text-right font-mono text-xs whitespace-nowrap text-muted tabular-nums sm:w-40" title={table.rowsEstimated ? 'The database\'s own estimate' : undefined}>
                                    {rowsOf(table)}
                                    {' rows'}
                                </span>
                                {table.bytes !== null && (
                                    <span className="w-20 shrink-0 text-right font-mono text-xs text-muted tabular-nums max-sm:hidden">{formatBytes(table.bytes)}</span>
                                )}
                            </label>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const BackupRow = ({ backup, busy, onDownload, onDelete }: { backup: Backup; busy: boolean; onDownload: () => void; onDelete: () => void }) => (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-ui font-medium">{backup.fileName}</div>
            <div className="truncate text-xs text-muted" title={backup.tables.join(', ')}>
                {plural(backup.tables.length, 'table')}
                {' · '}
                {plural(backup.rows, 'row')}
                {' · '}
                {formatBytes(backup.bytes)}
                {' · '}
                {backup.builtByName}
                {', '}
                {formatDateTime(backup.builtAtUtc)}
            </div>
        </div>
        <span className="text-xs text-muted">Kept until {formatDateTime(backup.keptUntilUtc)}</span>
        <div className="flex items-center gap-1.5">
            <Button variant="secondary" icon={<Download />} disabled={busy} onClick={onDownload}>
                Download
            </Button>
            <IconButton label={`Delete the backup ${backup.fileName}`} icon={<Trash2 />} tone="bad" disabled={busy} onClick={onDelete} />
        </div>
    </li>
);

/**
 * Backing up the database: choose its tables, build the backup on the server (a large one takes a
 * while; the panel waits for it), and download it as a .sql file that drops each table and creates
 * it again with its rows. Every table is read at the same moment. A backup is kept on the server a
 * while to download again, then deleted. Holders of `admin.database.backup` only.
 */
export const DatabasePage = () => {
    const tables = useDatabaseTables();
    const backups = useDatabaseBackups();
    const build = useBuildDatabaseBackup();
    const remove = useDeleteDatabaseBackup();
    const [ chosen, setChosen ] = useState<Set<string>>(new Set());
    const [ downloading, setDownloading ] = useState<string | null>(null);
    const all = tables.data?.tables ?? [];
    const picked = all.filter(table => chosen.has(table.name));
    const pickedBytes = picked.reduce((sum, table) => sum + (table.bytes ?? 0), 0);
    const items = backups.data?.items ?? [];
    const busy = build.isPending || remove.isPending || downloading !== null;

    const download = (backup: Backup) => {
        setDownloading(backup.id);
        downloadDatabaseBackup(backup).catch(toastError).finally(() => setDownloading(null));
    };

    const doBuild = () => build.mutate(picked.map(table => table.name), {
        onSuccess: (backup) => {
            toast(`Built ${backup.fileName}: ${plural(backup.tables.length, 'table')}, ${plural(backup.rows, 'row')}. Downloading it.`);
            download(backup);
        },
        onError: toastError,
    });

    const doDelete = (backup: Backup) => {
        ask({ title: `Delete the backup ${backup.fileName}?`, body: 'It is taken off the server. A copy you downloaded is yours to keep.', confirm: 'Delete' }, () => {
            remove.mutate(backup.id, {
                onSuccess: () => toast(`Deleted ${backup.fileName} from the server.`),
                onError: toastError,
            });
        });
    };

    return (
        <>
            <PageHeader title="Database" />
            <PageBody>
                <WarningNotice>
                    A backup holds everything in its tables: players&apos; private messages, login tickets and the settings&apos; secrets. Keep the file where only you can read it, and delete it from the server once you have it.
                </WarningNotice>

                <Panel
                    title="Build a backup"
                    description="Running the file puts the tables chosen back as they are now: each is dropped and created again with its rows. Tables not chosen are left as they are."
                    actions={(
                        <>
                            <span className="text-xs text-muted tabular-nums">
                                {plural(picked.length, 'table')}
                                {picked.length > 0 && pickedBytes > 0 && ` · ${formatBytes(pickedBytes)}`}
                            </span>
                            <Button icon={<DatabaseBackup />} disabled={busy || picked.length === 0} onClick={doBuild}>
                                {build.isPending ? 'Building…' : 'Build backup'}
                            </Button>
                        </>
                    )}
                >
                    {tables.error && <div className="p-4"><ErrorNotice error={tables.error} /></div>}
                    {tables.isPending && <Loading />}
                    {tables.data && <TablePicker tables={all} chosen={chosen} onChange={setChosen} disabled={build.isPending} />}
                </Panel>

                <Panel
                    title="Ready to download"
                    description={backups.data ? `Each is kept ${plural(backups.data.keepMinutes, 'minute')} after it is built, then deleted from the server. A restart deletes them too.` : undefined}
                >
                    {backups.error && <div className="p-4"><ErrorNotice error={backups.error} /></div>}
                    {backups.isPending && <Loading />}
                    {backups.data && items.length === 0 && (
                        <EmptyState icon={<DatabaseBackup className="text-muted" />}>No backup is waiting to be downloaded.</EmptyState>
                    )}
                    {items.length > 0 && (
                        <ul className="divide-y divide-line">
                            {items.map(backup => (
                                <BackupRow
                                    key={backup.id}
                                    backup={backup}
                                    busy={busy}
                                    onDownload={() => download(backup)}
                                    onDelete={() => doDelete(backup)}
                                />
                            ))}
                        </ul>
                    )}
                </Panel>
            </PageBody>
        </>
    );
};
