import { ArrowRight, Check, Hammer, Pencil, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { FILES, type GamedataFile, type GamedataStatus, useCheckHabbo, useRebuild, useSetFileKey } from '#/api/gamedata';
import { PhoneLabel, Row, RowList } from '#/components/RowList';
import { Badge, Button, ErrorNotice, IconButton, Input, Panel, SuccessNotice } from '#/components/ui';
import { fromNow } from '#/lib/time';

import { formatSize } from './labels';

interface HabboRow {
    tab: string;
    what: string;
    /** Habbo's version, or null before Habbo was checked. */
    version: { name: string; holds: string; importedAt: string | null } | null;
}

interface FileRow {
    what: string;
    file: GamedataFile;
    /** The client's setting that loads it, as the client names it. */
    setting: string;
}

/**
 * The client setting a file's address is written under: the variables that follow it. Staff who
 * manage the gamedata can choose another key; the one before is unlinked, keeping the /0 address.
 */
const FileKey = ({ file, keys, fallback, canManage }: { file: string; keys: string[]; fallback: string; canManage: boolean }) => {
    const [ editing, setEditing ] = useState(false);
    const [ key, setKey ] = useState('');
    const setFileKey = useSetFileKey();
    const shown = keys.length > 0 ? keys.join(', ') : null;

    if (editing) {
        const save = () => setFileKey.mutate({ file, key: key.trim() }, { onSuccess: () => setEditing(false) });

        return (
            <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-1">
                    <Input
                        value={key}
                        onChange={event => setKey(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && key.trim() !== '') save();
                            if (event.key === 'Escape') setEditing(false);
                        }}
                        placeholder={fallback}
                        aria-label={`Client setting for ${file}`}
                        className="min-w-0 flex-1 font-mono text-xs"
                        autoFocus
                    />
                    <IconButton label="Save" icon={<Check />} disabled={key.trim() === '' || setFileKey.isPending} onClick={save} />
                    <IconButton label="Cancel" icon={<X />} onClick={() => setEditing(false)} />
                </span>
                {setFileKey.error && <ErrorNotice error={setFileKey.error} />}
            </span>
        );
    }

    return (
        <span className="flex min-w-0 items-center gap-1">
            <span className="truncate font-mono text-xs" title={shown ?? undefined}>
                <PhoneLabel>Setting </PhoneLabel>
                {shown ?? <Badge tone="amber">no variable</Badge>}
            </span>
            {canManage && (
                <IconButton
                    label="Change the client setting"
                    icon={<Pencil />}
                    onClick={() => {
                        setKey(keys[0] ?? fallback);
                        setFileKey.reset();
                        setEditing(true);
                    }}
                />
            )}
        </span>
    );
};

/**
 * The gamedata at a glance: what Habbo serves now and whether the hotel has taken it in, and the
 * files clients load, with the client setting each belongs in. Habbo is checked on a schedule;
 * checking here asks it now.
 */
export const OverviewTab = ({ status }: { status: GamedataStatus }) => {
    const check = useCheckHabbo();
    const rebuild = useRebuild();
    const release = status.latestRelease;

    const habbo: HabboRow[] = [
        { tab: 'furniture', what: 'Furniture', version: release && { name: release.revision.replace(/^PRODUCTION-/, ''), holds: `${release.furnitureCount.toLocaleString()} items`, importedAt: release.importedAt } },
        { tab: 'products', what: 'Product data', version: status.latestProducts && { name: status.latestProducts.hash.slice(0, 10), holds: `${status.latestProducts.productCount.toLocaleString()} products`, importedAt: status.latestProducts.importedAt } },
        { tab: 'texts', what: 'Texts', version: status.latestTexts && { name: status.latestTexts.hash.slice(0, 10), holds: `${status.latestTexts.textCount.toLocaleString()} texts`, importedAt: status.latestTexts.importedAt } },
        { tab: 'figures', what: 'Figure data', version: status.latestFigures && { name: status.latestFigures.hash.slice(0, 10), holds: `${status.latestFigures.setCount.toLocaleString()} pieces`, importedAt: status.latestFigures.importedAt } },
    ];

    const files: FileRow[] = [
        { what: 'FurnitureData', file: status.furnitureData, setting: 'furnituredata.url' },
        { what: 'Product data', file: status.productData, setting: 'productdata.url' },
        { what: 'External texts', file: status.externalTexts, setting: 'gamedata.urls.externalTexts' },
        { what: 'Figure data', file: status.figureData, setting: 'figuredata.url' },
        { what: 'External variables', file: status.externalVariables, setting: 'nitro.config.url' },
    ];

    return (
        <>
            <Panel
                title="Habbo"
                description={release ? `habbo.${release.domain}, checked ${fromNow(release.checkedAt)}` : 'Not checked yet'}
                actions={status.canManage && (
                    <Button variant="secondary" icon={<RefreshCw />} disabled={check.isPending} onClick={() => check.mutate()}>
                        {check.isPending ? 'Checking' : 'Check now'}
                    </Button>
                )}
            >
                <RowList
                    columns="minmax(8rem,1fr) minmax(8rem,1fr) minmax(8rem,1fr) 9rem auto"
                    headers={[ { label: 'What' }, { label: 'Habbo serves' }, { label: 'Holds' }, { label: 'Hotel' }, {} ]}
                >
                    {habbo.map(row => (
                        <Row key={row.tab}>
                            <span className="font-medium">{row.what}</span>
                            <span className="font-mono text-xs">{row.version?.name ?? '-'}</span>
                            <span className="font-mono text-xs text-muted">{row.version?.holds ?? '-'}</span>
                            <span>
                                {!row.version && <Badge>not checked</Badge>}
                                {row.version?.importedAt && <Badge tone="green">taken in {fromNow(row.version.importedAt)}</Badge>}
                                {row.version && !row.version.importedAt && <Badge tone="amber">waiting</Badge>}
                            </span>
                            <Link to={`?tab=${row.tab}`} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline sm:justify-self-end [&>svg]:size-3.5">
                                Review <ArrowRight />
                            </Link>
                        </Row>
                    ))}
                </RowList>
                {(check.error || check.data) && (
                    <div className="border-t border-line p-4">
                        {check.error && <ErrorNotice error={check.error} />}
                        {check.data && (
                            <SuccessNotice>
                                {[
                                    check.data.isNew ? `New release: ${check.data.release.revision}.` : null,
                                    check.data.productsAreNew ? 'New product data.' : null,
                                    check.data.textsAreNew ? 'New texts.' : null,
                                    check.data.figuresAreNew ? 'New figure data.' : null,
                                ].filter(Boolean).join(' ') || 'Nothing new: Habbo serves what was already found.'}
                            </SuccessNotice>
                        )}
                    </div>
                )}
            </Panel>

            <Panel
                title="Files the client loads"
                description="Built from the database whenever what they're made from changes. Each file's address is written into the external variables under its client setting; change the key here if your client reads another. The external variables themselves are loaded from the client's page by nitro.config.url."
                actions={status.canManage && (
                    <Button
                        variant="secondary"
                        icon={<Hammer />}
                        disabled={rebuild.isPending}
                        onClick={() => Object.values(FILES).forEach(file => rebuild.mutate(file))}
                    >
                        Rebuild all
                    </Button>
                )}
            >
                <RowList
                    columns="minmax(12rem,1.4fr) minmax(12rem,1.2fr) 7rem 5rem 7rem"
                    headers={[ { label: 'File' }, { label: 'Client setting' }, { label: 'Build' }, { label: 'Size', className: 'text-right' }, { label: 'Built' } ]}
                >
                    {files.map((row) => {
                        const keys = status.fileKeys[row.file.file];

                        return (
                            <Row key={row.file.file}>
                                <span className="min-w-0">
                                    <span className="block font-medium">{row.what}</span>
                                    <span className="block truncate font-mono text-[11px] text-muted">/gamedata/{row.file.file}/0</span>
                                </span>
                                {keys
                                    ? <FileKey file={row.file.file} keys={keys} fallback={row.setting} canManage={status.canManage} />
                                    : <span className="truncate font-mono text-xs"><PhoneLabel>Setting </PhoneLabel>{row.setting}</span>}
                                <span className="font-mono text-xs" title={row.file.hash}>{row.file.hash.slice(0, 10)}</span>
                                <span className="font-mono text-xs text-muted tabular-nums sm:text-right">{formatSize(row.file.size)}</span>
                                <span className="text-xs text-muted">{fromNow(row.file.builtAt)}</span>
                            </Row>
                        );
                    })}
                </RowList>
                {(rebuild.error || rebuild.isSuccess) && (
                    <div className="border-t border-line p-4">
                        {rebuild.error && <ErrorNotice error={rebuild.error} />}
                        {rebuild.isSuccess && !rebuild.error && <SuccessNotice>Rebuilt.</SuccessNotice>}
                    </div>
                )}
            </Panel>
        </>
    );
};
