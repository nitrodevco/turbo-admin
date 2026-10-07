import { Save, Search, Trash2 } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import { catalogCalls, type CatalogFurniture, type CatalogOffer, type CatalogOfferInput, type CatalogTree, type EditableKind, type Membership, useCatalogEdit, useFurnitureSearch } from '#/api/catalog';
import { Button, ErrorNotice, Input, Labeled, Segmented, Select, Switch, WarningNotice } from '#/components/ui';
import { cx } from '#/lib/cx';

import { lengthOf, membershipOfName } from './labels';
import { LimitedSection } from './LimitedSection';
import { ProductIcon } from './ProductIcon';
import { ancestorsOf } from './tree';

const CLUB_LEVELS = [
    { value: '0', label: 'Anyone' },
    { value: '1', label: 'Club' },
    { value: '2', label: 'VIP' },
];

const TYPES = [
    { value: 'floor', label: 'Floor' },
    { value: 'wall', label: 'Wall' },
    { value: 'badge', label: 'Badge' },
    { value: 'club', label: 'Club' },
];

const MEMBERSHIPS = [
    { value: 'HabboClub', label: 'Habbo Club' },
    { value: 'BuildersClub', label: 'Builders Club' },
];

/** Picking the item an offer gives, by the start of its class name or its id. */
const ItemPicker = ({ type, value, onPick }: { type: 'floor' | 'wall'; value: { id: number | null; name: string | null }; onPick: (item: CatalogFurniture) => void }) => {
    const [ text, setText ] = useState('');
    const search = useFurnitureSearch(text);
    const items = (search.data ?? []).filter(x => x.type === type);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                {value.id
                    ? <><span className="font-mono font-medium">{value.name ?? `#${value.id}`}</span><span className="font-mono text-xs text-muted">#{value.id}</span></>
                    : <span className="text-muted">No item chosen.</span>}
            </div>
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <Input
                    type="search"
                    value={text}
                    onChange={event => setText(event.target.value)}
                    placeholder={`Find a ${type} item by class name or id`}
                    aria-label="Find an item"
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full pl-9 font-mono"
                />
            </div>
            {text.trim() && (
                <ul className="max-h-48 overflow-y-auto rounded-lg border border-line">
                    {items.length === 0
                        ? <li className="px-3 py-2 text-sm text-muted">{search.isFetching ? 'Looking…' : `No ${type} item matches.`}</li>
                        : items.map(item => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onPick(item);
                                            setText('');
                                        }}
                                        className={cx('flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-subtle sm:min-h-8', item.id === value.id && 'text-accent')}
                                    >
                                        <ProductIcon type={item.type} name={item.name} className="size-6 [&>img]:max-h-6 [&>img]:max-w-6" />
                                        <span className="min-w-0 flex-1 truncate font-mono">{item.name}</span>
                                        <span className="font-mono text-[11px] text-muted">#{item.id} · sprite {item.spriteId}</span>
                                    </button>
                                </li>
                            ))}
                </ul>
            )}
        </div>
    );
};

/** What a new offer on this page starts as: a membership in the club window, a gift with the gifts. */
export type OfferStart = 'item' | 'membership' | 'gift';

const inputOf = (offer: CatalogOffer | null, pageId: number, start: OfferStart): CatalogOfferInput => {
    const product = offer?.products[0];
    const editable = offer !== null && offer.products.length === 1 && product
        && ([ 'floor', 'wall', 'badge' ].includes(product.type) || (product.type === 'club' && product.subscriptionType !== null));

    return {
        pageId,
        localizationId: offer?.localizationId ?? '',
        costCredits: offer?.costCredits ?? 0,
        costCurrency: offer?.costCurrency ?? 0,
        currencyTypeId: offer?.currencyTypeId ?? null,
        canGift: offer?.canGift ?? start === 'item',
        canBundle: offer?.canBundle ?? start === 'item',
        clubLevel: offer?.clubLevel ?? 0,
        visible: offer?.visible ?? true,
        clubGiftDaysRequired: offer ? offer.clubGiftDaysRequired : start === 'gift' ? 0 : null,
        product: offer === null
            ? start === 'membership'
                ? { type: 'club', definitionId: null, extraParam: null, quantity: 1, subscription: 'HabboClub', subscriptionDays: 31 }
                : { type: 'floor', definitionId: null, extraParam: null, quantity: 1, subscription: null, subscriptionDays: 0 }
            : editable
                ? {
                        type: product.type as EditableKind,
                        definitionId: product.definitionId,
                        extraParam: product.extraParam,
                        quantity: product.quantity,
                        subscription: product.subscriptionType,
                        subscriptionDays: product.subscriptionDays,
                    }
                : null,
    };
};

/**
 * One offer, new or saved: what it gives (an item picked by class name, a badge code, or days of
 * Habbo Club or Builders Club, and how many), its name key, its price in credits and in an
 * activity-point currency, who may buy it, whether it can be gifted or bought in bulk, whether it
 * shows, and the page it is on. In the normal catalog it can be a club gift members claim, and an
 * item can be sold as a limited series. An offer that gives something else (a pet, a bot, several
 * things) keeps that as it is.
 */
export const OfferEditor = ({ tree, pageId, offer, canManage, start = 'item', onDone }: { tree: CatalogTree; pageId: number; offer: CatalogOffer | null; canManage: boolean; start?: OfferStart; onDone: () => void }) => {
    const [ draft, setDraft ] = useState(() => inputOf(offer, pageId, start));
    const [ pickedName, setPickedName ] = useState<string | null>(offer?.products[0]?.definitionName ?? null);
    const save = useCatalogEdit(offer ? (input: CatalogOfferInput) => catalogCalls.updateOffer(offer.id, input) : catalogCalls.createOffer);
    const remove = useCatalogEdit(catalogCalls.deleteOffer);
    const product = draft.product;
    const normal = tree.catalogType === 'Normal';
    const limited = offer?.products.find(x => x.limited !== null)?.limited ?? null;
    const membership = product?.type === 'club' || (product === null && offer?.products.some(x => x.subscriptionType !== null));
    const gift = draft.clubGiftDaysRequired !== null;
    // A length name key that says another length than the membership gives: the client sells it by its days.
    const named = product?.type === 'club' ? membershipOfName(draft.localizationId) : null;
    const misnamed = named !== null && product !== null && (named.days !== product.subscriptionDays || named.subscription !== (product.subscription ?? 'HabboClub'));
    const canBeLimited = normal && offer !== null && !gift && offer.products.length === 1 && [ 'floor', 'wall' ].includes(offer.products[0]?.type ?? '');

    const pages = useMemo(() => tree.pages
        .filter(x => x.id !== tree.rootId)
        .map(x => ({ id: x.id, label: [ ...ancestorsOf(tree, x.id).map(a => a.localization).reverse(), x.localization ].join(' / ') }))
        .sort((a, b) => a.label.localeCompare(b.label)), [ tree ]);

    const set = <K extends keyof CatalogOfferInput>(key: K, value: CatalogOfferInput[K]) => setDraft({ ...draft, [key]: value });

    const setKind = (type: EditableKind) => set('product', {
        type,
        definitionId: type === 'floor' || type === 'wall' ? product?.definitionId ?? null : null,
        extraParam: type === 'badge' ? product?.extraParam ?? null : null,
        quantity: 1,
        subscription: type === 'club' ? product?.subscription ?? 'HabboClub' : null,
        subscriptionDays: type === 'club' ? (product?.subscriptionDays || 31) : 0,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        save.mutate([ draft ], { onSuccess: () => offer === null && onDone() });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-line bg-canvas/40 p-4">
            {product
                ? (
                        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                            <div className="flex flex-col gap-2">
                                <Segmented
                                    label="It gives"
                                    value={product.type}
                                    onChange={value => setKind(value as EditableKind)}
                                    options={gift ? TYPES.filter(x => x.value === 'floor' || x.value === 'wall') : normal ? TYPES : TYPES.filter(x => x.value !== 'club')}
                                    disabled={!canManage || limited !== null}
                                />
                                {product.type === 'badge' && (
                                    <Input value={product.extraParam ?? ''} onChange={event => set('product', { ...product, extraParam: event.target.value })} placeholder="Badge code, e.g. ADM" aria-label="Badge code" className="font-mono" disabled={!canManage} />
                                )}
                                {(product.type === 'floor' || product.type === 'wall') && (
                                    <ItemPicker
                                        type={product.type}
                                        value={{ id: product.definitionId, name: pickedName }}
                                        onPick={(item) => {
                                            setPickedName(item.name);
                                            set('product', { ...product, definitionId: item.id });
                                        }}
                                    />
                                )}
                                {product.type === 'club' && (
                                    <div className="flex flex-col gap-2">
                                        <Segmented
                                            label="Membership"
                                            value={product.subscription ?? 'HabboClub'}
                                            onChange={value => set('product', { ...product, subscription: value as Membership })}
                                            options={MEMBERSHIPS}
                                            disabled={!canManage}
                                        />
                                        <p className="text-xs text-muted">
                                            {product.subscription === 'BuildersClub'
                                                ? 'Builders Club days, bought from a Builders Club page.'
                                                : 'Habbo Club days. The club window (the page with the link key hc_membership) lists every shown membership, wherever it is.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {product.type === 'club'
                                ? (
                                        <Labeled label="Days" hint={lengthOf(product.subscriptionDays)}>
                                            <Input type="number" min={1} max={3650} value={product.subscriptionDays} onChange={event => set('product', { ...product, subscriptionDays: Number(event.target.value) || 0 })} disabled={!canManage} className="font-mono" aria-label="Days" />
                                        </Labeled>
                                    )
                                : (
                                        <Labeled label="How many">
                                            <Input type="number" min={1} max={100} value={product.quantity} onChange={event => set('product', { ...product, quantity: Number(event.target.value) || 1 })} disabled={!canManage} className="font-mono" aria-label="How many" />
                                        </Labeled>
                                    )}
                        </div>
                    )
                : (
                        <p className="text-sm text-muted">
                            Gives {offer?.products.map(x => x.definitionName ?? x.extraParam ?? x.type).join(', ')}; that is kept as it is.
                        </p>
                    )}

            <div className="grid gap-3 sm:grid-cols-3">
                <Labeled label="Name key" hint={membership ? 'Empty: named by its length, e.g. habbo_club_3_months.' : gift ? 'Members claim the gift by it, so no two gifts share one.' : 'Empty: the item\'s class name.'}>
                    <Input
                        value={draft.localizationId}
                        onChange={(event) => {
                            const name = event.target.value;
                            const said = membershipOfName(name);

                            // A membership named by its length gives that length, as the server names them.
                            setDraft(draft.product?.type === 'club' && said
                                ? { ...draft, localizationId: name, product: { ...draft.product, subscription: said.subscription, subscriptionDays: said.days } }
                                : { ...draft, localizationId: name });
                        }}
                        maxLength={512}
                        disabled={!canManage}
                        className="font-mono"
                        aria-label="Name key"
                    />
                </Labeled>
                {!gift && (
                    <>
                        <Labeled label="Credits">
                            <Input type="number" min={0} value={draft.costCredits} onChange={event => set('costCredits', Math.max(0, Number(event.target.value) || 0))} disabled={!canManage} className="font-mono" aria-label="Credits" />
                        </Labeled>
                        <Labeled label="And a currency">
                            <div className="flex gap-2">
                                <Input type="number" min={0} value={draft.costCurrency} onChange={event => set('costCurrency', Math.max(0, Number(event.target.value) || 0))} disabled={!canManage} className="w-24 font-mono" aria-label="Currency amount" />
                                <Select
                                    value={draft.currencyTypeId ?? ''}
                                    onChange={event => set('currencyTypeId', event.target.value ? Number(event.target.value) : null)}
                                    disabled={!canManage || tree.currencies.length === 0}
                                    aria-label="Currency"
                                    className="min-w-0 flex-1"
                                >
                                    <option value="">None</option>
                                    {tree.currencies.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                                </Select>
                            </div>
                        </Labeled>
                    </>
                )}
            </div>

            {misnamed && product && (
                <WarningNotice>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span>
                            The name key says {lengthOf(named.days)}, but the membership gives {lengthOf(product.subscriptionDays)}. The client sells it by its days.
                        </span>
                        {canManage && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => set('product', { ...product, subscription: named.subscription, subscriptionDays: named.days })}
                                className="h-8 sm:h-8"
                            >
                                Make it {lengthOf(named.days)}
                            </Button>
                        )}
                    </span>
                </WarningNotice>
            )}

            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                {!membership && !gift && (
                    <Labeled label="Who may buy it" className="w-full sm:w-64">
                        <Segmented label="Who may buy it" value={String(draft.clubLevel)} onChange={value => set('clubLevel', Number(value))} options={CLUB_LEVELS} disabled={!canManage} />
                    </Labeled>
                )}
                <Switch label="Shown" checked={draft.visible} onChange={value => set('visible', value)} disabled={!canManage} />
                {!membership && !gift && (
                    <>
                        <Switch label="Can be gifted" checked={draft.canGift} onChange={value => set('canGift', value)} disabled={!canManage} />
                        <Switch label="Can be bought in bulk" checked={draft.canBundle} onChange={value => set('canBundle', value)} disabled={!canManage} />
                    </>
                )}
            </div>

            {normal && !membership && limited === null && (
                <div className="flex flex-wrap items-end gap-3">
                    <Switch
                        label="Club gift"
                        hint="Claimed for free by members, one gift per month of club used up."
                        checked={gift}
                        onChange={value => set('clubGiftDaysRequired', value ? 0 : null)}
                        disabled={!canManage}
                    />
                    {gift && (
                        <Labeled label="Club days needed" hint={draft.clubGiftDaysRequired ? `${lengthOf(draft.clubGiftDaysRequired)} of club used up.` : 'Any member.'}>
                            <Input type="number" min={0} value={draft.clubGiftDaysRequired ?? 0} onChange={event => set('clubGiftDaysRequired', Math.max(0, Number(event.target.value) || 0))} disabled={!canManage} className="w-28 font-mono" aria-label="Club days needed" />
                        </Labeled>
                    )}
                </div>
            )}

            {offer && canBeLimited && <LimitedSection offerId={offer.id} limited={limited} canManage={canManage} />}

            {offer && (
                <Labeled label="On the page">
                    <Select value={draft.pageId} onChange={event => set('pageId', Number(event.target.value))} disabled={!canManage} aria-label="Page" className="sm:max-w-96">
                        {pages.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </Select>
                </Labeled>
            )}

            {(save.error ?? remove.error) && <ErrorNotice error={save.error ?? remove.error} />}
            {save.isSuccess && offer && <p className="text-xs text-good">Saved. Publish to put it in front of players.</p>}

            {canManage && (
                <div className="flex flex-wrap gap-2">
                    <Button type="submit" icon={<Save />} disabled={save.isPending}>{offer ? 'Save offer' : 'Add offer'}</Button>
                    <Button variant="ghost" onClick={onDone}>{offer ? 'Close' : 'Cancel'}</Button>
                    {offer && (
                        <Button
                            variant="danger"
                            icon={<Trash2 />}
                            disabled={remove.isPending}
                            onClick={() => window.confirm('Delete this offer? What was bought from it stays bought.') && remove.mutate([ offer.id ], { onSuccess: onDone })}
                            className="ml-auto"
                        >
                            Delete
                        </Button>
                    )}
                </div>
            )}
        </form>
    );
};
