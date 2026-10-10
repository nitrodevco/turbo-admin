import { ChevronRight, Upload } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useSearchParams } from 'react-router';

import { type AssetBundle, type AssetsStatus, BUNDLE_KINDS, type BundleKind, type BundleStatus, useBundles } from '#/api/bundles';
import { ListToolbar } from '#/components/ListToolbar';
import { SearchInput } from '#/components/SearchInput';
import { Tabs } from '#/components/Tabs';
import { Badge, Button, EmptyState, ErrorNotice, Loading, Select } from '#/components/ui';
import { cx } from '#/lib/cx';

import { BundleDetail } from './BundleDetail';
import { BundleIcon } from './BundleIcon';
import { formatBytes } from './format';
import { UploadModal } from './UploadModal';

const STATUSES: { value: BundleStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'ok', label: 'OK' },
    { value: 'failed', label: 'Failed' },
    { value: 'unused', label: 'Unused' },
];

const isKind = (value: string | null): value is BundleKind => BUNDLE_KINDS.some(x => x.value === value);
const isStatus = (value: string | null): value is BundleStatus => STATUSES.some(x => x.value === value);

/** What loads a bundle, in a few words: its effect ids, or its pet type. */
const idsOf = (bundle: AssetBundle) => {
    if (bundle.ids.length === 0)
        return null;

    if (bundle.kind === 'pet')
        return `type ${bundle.ids.join(', ')}`;

    const shown = bundle.ids.slice(0, 6).join(', ');

    return `${bundle.ids.length === 1 ? 'id' : 'ids'} ${shown}${bundle.ids.length > 6 ? ` +${bundle.ids.length - 6}` : ''}`;
};

const BundleRow = ({ bundle, onOpen }: { bundle: AssetBundle; onOpen: () => void }) => {
    const ids = idsOf(bundle);

    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-subtle/60 focus-visible:bg-subtle focus-visible:outline-none sm:px-4"
            >
                <BundleIcon kind={bundle.kind} name={bundle.name} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className={cx('truncate font-mono text-[13px] font-medium', !bundle.used && 'text-muted')}>{bundle.name}</span>
                        {bundle.source === 'upload' && <Badge tone="accent">upload</Badge>}
                        {!bundle.used && <Badge tone="amber">unused</Badge>}
                    </span>
                    {bundle.error
                        ? <span className="truncate text-xs text-bad" title={bundle.error}>{bundle.error}</span>
                        : (
                                <span className="truncate font-mono text-[11px] text-muted">
                                    <span className="md:hidden">{[ bundle.revision !== null ? `rev ${bundle.revision}` : null, ids, formatBytes(bundle.size) ].filter(Boolean).join(' · ')}</span>
                                    <span className="max-md:hidden">{ids ?? (bundle.source === 'upload' ? 'uploaded' : 'from Habbo')}</span>
                                </span>
                            )}
                </span>
                <span className="hidden w-24 shrink-0 text-right font-mono text-xs text-muted tabular-nums md:block">{bundle.revision ?? '-'}</span>
                <span className="hidden w-20 shrink-0 text-right font-mono text-xs text-muted tabular-nums md:block">{bundle.error ? '-' : formatBytes(bundle.size)}</span>
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
            </button>
        </li>
    );
};

/**
 * Every bundle of a kind, found by name or id and narrowed to the failed or unused ones; a bundle
 * opens to its files. Staff who manage the assets can upload one.
 */
export const BundlesTab = ({ status }: { status: AssetsStatus }) => {
    const [ params, setParams ] = useSearchParams();
    const kind: BundleKind = isKind(params.get('kind')) ? params.get('kind') as BundleKind : 'furniture';
    const filter: BundleStatus = isStatus(params.get('status')) ? params.get('status') as BundleStatus : 'all';
    const [ text, setText ] = useState(params.get('q') ?? '');
    const q = useDeferredValue(text.trim());
    const [ page, setPage ] = useState(0);
    const [ open, setOpen ] = useState<{ kind: BundleKind; name: string } | null>(null);
    const [ uploading, setUploading ] = useState(false);
    const { data, error, isFetching } = useBundles(kind, q, filter, page);
    const pageSize = data?.pageSize ?? 60;

    const change = (next: { kind?: BundleKind; status?: BundleStatus }) => {
        const merged = new URLSearchParams(params);

        if (next.kind)
            merged.set('kind', next.kind);

        if (next.status)
            merged.set('status', next.status);

        merged.delete('q');
        setParams(merged, { replace: true });
        setPage(0);
    };

    return (
        <>
            <Tabs
                label="Kind"
                value={kind}
                onChange={value => change({ kind: value as BundleKind })}
                tabs={BUNDLE_KINDS.map(x => ({ value: x.value, label: x.label, count: status.kinds.find(y => y.kind === x.value)?.bundles }))}
            />
            <section className="overflow-clip rounded-xl border border-line bg-surface">
                <ListToolbar
                    watch={[ kind, filter, q, page ]}
                    page={{ offset: page * pageSize, limit: pageSize, total: data?.total, onChange: offset => setPage(Math.round(offset / pageSize)) }}
                >
                    <SearchInput
                        value={text}
                        onValueChange={(value) => {
                            setText(value);
                            setPage(0);
                        }}
                        placeholder={kind === 'furniture' ? 'Find by name' : 'Find by name or id'}
                        className="w-full sm:w-56"
                    />
                    {/* The filter and the upload share a row on a phone, under the search. */}
                    <div className="flex w-full gap-2 sm:w-auto">
                        <Select aria-label="Status" value={filter} onChange={event => change({ status: event.target.value as BundleStatus })} className="min-w-0 flex-1 sm:w-36 sm:flex-none">
                            {STATUSES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                        </Select>
                        {status.canManage && <Button variant="secondary" icon={<Upload />} onClick={() => setUploading(true)}>Upload</Button>}
                    </div>
                </ListToolbar>

                {error && <div className="p-4"><ErrorNotice error={error} /></div>}
                {!data && !error && <Loading />}
                {data && data.items.length === 0 && (
                    <EmptyState>
                        {q ? `No ${BUNDLE_KINDS.find(x => x.value === kind)!.one} bundle matches "${q}".` : filter === 'all' ? 'There are no bundles of this kind yet. A sync from Habbo takes them.' : `No ${filter} bundles.`}
                    </EmptyState>
                )}
                {data && data.items.length > 0 && (
                    <>
                        <div className="hidden items-center gap-3 border-b border-line px-4 py-2 font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase md:flex">
                            <span className="w-10 shrink-0" />
                            <span className="flex-1">Bundle</span>
                            <span className="w-24 shrink-0 text-right">Revision</span>
                            <span className="w-20 shrink-0 text-right">Size</span>
                            <span className="w-4 shrink-0" />
                        </div>
                        <ul className={cx('divide-y divide-line transition-opacity', isFetching && 'opacity-70')}>
                            {data.items.map(bundle => (
                                <BundleRow key={`${bundle.kind}/${bundle.name}`} bundle={bundle} onOpen={() => setOpen({ kind: bundle.kind, name: bundle.name })} />
                            ))}
                        </ul>
                    </>
                )}
            </section>

            <BundleDetail bundle={open} canManage={status.canManage} onClose={() => setOpen(null)} />
            {uploading && (
                <UploadModal
                    open
                    kind={kind}
                    onClose={() => setUploading(false)}
                    onUploaded={bundle => setOpen({ kind: bundle.kind, name: bundle.name })}
                />
            )}
        </>
    );
};
