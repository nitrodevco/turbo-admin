import { ArrowRight, Copy, EyeOff, PackageSearch, Star, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { type CatalogTree, FRONT_PAGE_LAYOUT, useDuplicates, useUnoffered } from '#/api/catalog';
import { Button } from '#/components/ui';
import { cx } from '#/lib/cx';

import { PageIcon } from './PageTree';

const Card = ({ icon, title, value, blurb, action, tone }: { icon: ReactNode; title: string; value?: ReactNode; blurb: string; action: ReactNode; tone?: 'warn' | 'good' }) => (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-start gap-3">
            <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5', tone === 'warn' ? 'bg-warn-soft text-warn' : tone === 'good' ? 'bg-good-soft text-good' : 'bg-accent-soft text-accent')}>{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{title}</div>
                {value !== undefined && <div className="font-mono text-2xl font-semibold tabular-nums">{value}</div>}
            </div>
        </div>
        <p className="text-xs leading-relaxed text-muted">{blurb}</p>
        <div className="mt-auto">{action}</div>
    </div>
);

interface CatalogHomeProps {
    tree: CatalogTree;
    busy: boolean;
    onOpenPage: (id: number) => void;
    onView: (view: 'missing' | 'duplicates' | 'generate') => void;
    onCreateFrontPage: () => void;
}

/**
 * The editor before a page is picked: the catalog at a glance - its tabs to jump into, the front
 * page (or making one), the furni it doesn't sell and the furni it sells twice - and generating a
 * whole new catalog.
 */
export const CatalogHome = ({ tree, busy, onOpenPage, onView, onCreateFrontPage }: CatalogHomeProps) => {
    const missing = useUnoffered({ scope: 'missing', q: '', line: '', category: '', page: 0, size: 1 });
    const duplicates = useDuplicates();
    const front = tree.pages.find(x => x.layout === FRONT_PAGE_LAYOUT);
    const tabs = tree.pages.filter(x => x.parentId === tree.rootId).sort((a, b) => a.sortOrder - b.sortOrder);
    const offers = tree.pages.reduce((sum, x) => sum + x.offerCount, 0);
    const hidden = tree.pages.filter(x => x.display === 'invisible').length;
    const shownDuplicates = duplicates.data?.items.filter(x => x.offers.filter(o => o.shown).length > 1).length;

    return (
        <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                    { label: 'Tabs', value: tabs.length },
                    { label: 'Pages', value: tree.pages.length - 1 },
                    { label: 'Offers', value: offers },
                    { label: 'Hidden pages', value: hidden, icon: <EyeOff className="size-3" /> },
                ].map(x => (
                    <div key={x.label} className="rounded-xl border border-line bg-surface px-3 py-2.5">
                        <div className="flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{x.icon}{x.label}</div>
                        <div className="font-mono text-xl font-semibold tabular-nums">{x.value.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                <Card
                    icon={<Star />}
                    title="Front page"
                    tone={front ? 'good' : 'warn'}
                    blurb={front ? `${front.localization} is where the catalogue opens, with the featured items and the voucher box.` : 'There is no front page: the catalogue opens on its first tab. Make one, then pick its featured items.'}
                    action={front
                        ? <Button variant="secondary" icon={<ArrowRight />} onClick={() => onOpenPage(front.id)}>Open it</Button>
                        : tree.canManage && <Button icon={<Star />} disabled={busy} onClick={onCreateFrontPage}>Make a front page</Button>}
                />
                <Card
                    icon={<PackageSearch />}
                    title="Furni not in the catalog"
                    value={missing.data?.total.toLocaleString() ?? '…'}
                    tone={missing.data && missing.data.total > 0 ? 'warn' : undefined}
                    blurb="Floor and wall items no offer sells. Find them by line or category, and put them on a page in one go."
                    action={<Button variant="secondary" icon={<ArrowRight />} onClick={() => onView('missing')}>Find them</Button>}
                />
                <Card
                    icon={<Copy />}
                    title="Sold more than once"
                    value={duplicates.data ? duplicates.data.total.toLocaleString() : '…'}
                    tone={shownDuplicates ? 'warn' : undefined}
                    blurb={shownDuplicates ? `${shownDuplicates} of them players can see on more than one page.` : 'Furni sold alone by more than one offer, with where each is.'}
                    action={<Button variant="secondary" icon={<ArrowRight />} onClick={() => onView('duplicates')}>Look at them</Button>}
                />
                <Card
                    icon={<Wand2 />}
                    title="Generate a catalog"
                    blurb="A whole catalog from the hotel's furni, pets, effects and songs, with tabs that make sense and the right layout and icon on every page."
                    action={<Button variant="secondary" icon={<ArrowRight />} onClick={() => onView('generate')}>Plan one</Button>}
                />
            </div>

            {tabs.length > 0 && (
                <section className="rounded-xl border border-line bg-surface p-3">
                    <h3 className="mb-2 px-1 font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase">Tabs</h3>
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
                        {tabs.map(tab => (
                            <li key={tab.id}>
                                <button type="button" onClick={() => onOpenPage(tab.id)} className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-canvas px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md">
                                    <PageIcon icon={tab.icon} className="size-6" />
                                    <span className="min-w-0 flex-1">
                                        <span className={cx('block truncate text-sm font-medium', tab.display === 'invisible' && 'text-muted')}>{tab.localization}</span>
                                        <span className="block text-[11px] text-muted">{tree.pages.filter(x => x.parentId === tab.id).length} pages</span>
                                    </span>
                                    {tab.display === 'invisible' && <EyeOff className="size-3.5 text-muted" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
};
