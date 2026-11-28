import { useEffect, useRef, useState } from 'react';

import { type HandItem, handItemPreview, useHandItemSearch } from '#/api/gamedata';
import { ListToolbar } from '#/components/ListToolbar';
import { SearchInput } from '#/components/SearchInput';
import { EmptyState, ErrorNotice, Loading, Panel } from '#/components/ui';
import { cx } from '#/lib/cx';
import { useDebounced } from '#/lib/debounce';

export const HandItemPreview = ({ item, compact = false }: { item: HandItem; compact?: boolean }) => {
    const host = useRef<HTMLSpanElement>(null);
    const [ visible, setVisible ] = useState(() => !('IntersectionObserver' in window));
    const [ url, setUrl ] = useState<string | null>(null);
    const [ failed, setFailed ] = useState(false);

    useEffect(() => {
        const node = host.current;

        if (!node || !('IntersectionObserver' in window))
            return;

        const observer = new IntersectionObserver(([ entry ]) => {
            if (entry?.isIntersecting) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '160px' });

        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!visible || !item.previewAvailable)
            return;

        let current: string | null = null;
        let active = true;
        void handItemPreview(item.id).then((blob) => {
            if (active) {
                current = URL.createObjectURL(blob);
                setUrl(current);
            }
        }).catch(() => {
            if (active)
                setFailed(true);
        });

        return () => {
            active = false;
            if (current)
                URL.revokeObjectURL(current);
        };
    }, [ item.id, item.previewAvailable, visible ]);

    return (
        <span ref={host} className={`grid ${compact ? 'size-10' : 'size-16'} shrink-0 place-items-center overflow-hidden rounded-lg bg-subtle`}>
            {url && !failed ? <img src={url} alt="" className="max-h-full max-w-full [image-rendering:pixelated]" /> : <span className="text-xs text-muted">{item.previewAvailable ? 'Preview' : 'No preview'}</span>}
        </span>
    );
};

/**
 * The hand items a vending furni can give, as the hotel's own client data has them: each with its
 * name from the texts and its art from the figure bundles. Found by id, name or figure library.
 */
export const HandItemsPage = () => {
    const [ text, setText ] = useState('');
    const [ page, setPage ] = useState(0);
    const { data: found, error, isFetching } = useHandItemSearch(useDebounced(text), page);
    const size = found?.pageSize ?? 1;

    return (
        <>
            {found?.message && <p className="rounded-lg bg-canvas px-3 py-2.5 text-sm text-muted">{found.message} Download and build client assets if needed, then sync assets and import texts for names.</p>}
            <Panel className="overflow-clip">
                <ListToolbar
                    watch={[ text, page ]}
                    page={{ offset: page * size, limit: size, total: found?.total, onChange: offset => setPage(Math.floor(offset / size)) }}
                >
                    <SearchInput
                        value={text}
                        onValueChange={(value) => {
                            setText(value);
                            setPage(0);
                        }}
                        placeholder="Name or ID"
                        className="min-w-48 flex-1 sm:max-w-96"
                        aria-label="Find hand items"
                    />
                </ListToolbar>
                {error && <div className="p-4"><ErrorNotice error={error} /></div>}
                {!found && isFetching && <Loading />}
                {found && found.items.length === 0 && <EmptyState>{text.trim() ? 'No hand item has those words.' : 'No hand items are available yet. Download and build client assets, sync assets and import texts, then try again.'}</EmptyState>}
                {found && found.items.length > 0 && (
                    <ul className={cx('divide-y divide-line transition-opacity', isFetching && 'opacity-60')}>
                        {found.items.map(item => (
                            <li key={item.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                                <HandItemPreview key={`${found.revision}-${item.id}`} item={item} />
                                <span className="flex min-w-0 flex-1 flex-col gap-1">
                                    <span className="truncate font-medium">{item.name || `Hand item ${item.id}`}</span>
                                    <span className="font-mono text-xs text-muted">Hand item {item.id}</span>
                                </span>
                                <span className="shrink-0 text-right text-xs text-muted">{item.assetAvailable ? 'Asset available' : 'Asset missing'}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </>
    );
};
