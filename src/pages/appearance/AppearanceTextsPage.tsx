import { Languages, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { type TextEntry, useSaveText, useTextSearch } from '#/api/gamedata';
import { type TemplateIndex, useTemplateIndex } from '#/api/windows';
import { useSaved } from '#/components/SaveFeedback';
import { SearchInput } from '#/components/SearchInput';
import { toastError } from '#/components/toast';
import { Button, ButtonLink, EmptyState, ErrorNotice, Input, Loading, PageBody, PageHeader, Panel, Segmented } from '#/components/ui';
import { useHubTabs } from '#/layout/nav';
import { useDebounced } from '#/lib/debounce';
import { useFillHeight } from '#/lib/fillHeight';
import { plural } from '#/lib/plural';
import { usePathTab } from '#/lib/tabs';

import { flatElements, windowName } from './studio/windows';
import { WindowPick } from './WindowPick';

const TABS = [
    { value: 'windows', label: 'By window', to: '/appearance/texts/windows' },
    { value: 'shown', label: 'By shown text', to: '/appearance/texts/shown' },
];

const LIST_LIMIT = 60;

/** The text keys each window shows, by window id: what its captions and variables name. */
const textsByWindow = (index: TemplateIndex) => new Map(Object.entries(index.templates).map(([ id, window ]) => [ id, [ ...new Set(flatElements(window.elements).flatMap(element => element.texts ?? [])) ] ]));

/** One text: its key, what players see now (Habbo's beside it when the hotel changed it), edited in place. */
const TextRow = ({ entry, textKey, where }: { entry: TextEntry | undefined; textKey: string; where?: { id: string; name: string }[] }) => {
    const [ value, setValue ] = useState<string | null>(null);
    const save = useSaveText();
    const saved = useSaved();
    const shown = value ?? entry?.value ?? '';
    const dirty = value !== null && value !== (entry?.value ?? '');

    return (
        <li className="flex flex-col gap-1.5 px-4 py-2.5" data-text={textKey}>
            <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-xs">{textKey}</code>
                {entry?.habbo !== null && entry?.habbo !== undefined && entry.habbo !== entry.value && <span className="text-xs text-muted">{`Habbo's: ${entry.habbo}`}</span>}
                {where && where.length > 0 && (
                    <span className="flex flex-wrap gap-x-2 text-xs">
                        <span className="text-muted">Shown in</span>
                        {where.slice(0, 4).map(window => <Link key={window.id} to={`/appearance/studio?${new URLSearchParams({ window: window.id })}`} title={window.id} className="text-accent hover:underline">{window.name}</Link>)}
                        {where.length > 4 && <span className="text-muted">{`and ${where.length - 4} more`}</span>}
                    </span>
                )}
            </div>
            <form
                className="flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();

                    if (dirty) save.mutate({ key: textKey, value: shown }, { onSuccess: () => {
                        setValue(null);
                        saved(`The text ${textKey}`);
                    }, onError: toastError });
                }}
            >
                <Input aria-label={textKey} value={shown} placeholder={entry ? '' : 'No text yet: the client shows the key'} onChange={event => setValue(event.target.value)} className="flex-1" />
                <Button type="submit" icon={<Save />} disabled={!dirty || save.isPending}>Save</Button>
            </form>
        </li>
    );
};

/** A text found by its key: the search answers every key or text holding the words, so the exact key is picked out. */
const KeyedRow = ({ textKey }: { textKey: string }) => {
    const { data } = useTextSearch(textKey, 0);

    return <TextRow textKey={textKey} entry={data?.items.find(item => item.key === textKey)} />;
};

/** Pick a window (by its id, its name, or a text key it shows) and edit every text it shows. */
const ByWindow = ({ index }: { index: TemplateIndex }) => {
    const [ params, setParams ] = useSearchParams();
    const [ text, setText ] = useState(() => params.get('q') ?? '');
    const words = useDebounced(text).trim().toLowerCase();
    const id = params.get('id');
    const texts = useMemo(() => textsByWindow(index), [ index ]);
    const found = [ ...texts ]
        .filter(([ each, keys ]) => keys.length > 0 && (!words || each.toLowerCase().includes(words) || windowName(index, each).toLowerCase().includes(words) || keys.some(key => key.toLowerCase().includes(words))))
        .map(([ each ]) => ({ id: each, name: windowName(index, each) }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const keys = id ? texts.get(id) ?? [] : [];
    const fillList = useFillHeight<HTMLElement>();

    return (
        <div className="grid items-start gap-4 lg:gap-6 lg:grid-cols-[22rem_1fr]">
            <Panel ref={fillList} title="Windows" description={`${found.length} window(s) showing texts`} className="flex flex-col overflow-clip lg:sticky lg:top-4 lg:max-h-(--fill-height)">
                <div className="border-b border-line p-3"><SearchInput value={text} onValueChange={setText} placeholder="A window, its file, or a text key" aria-label="Find a window" /></div>
                <ul className="max-h-[60dvh] min-h-0 overflow-y-auto lg:max-h-none">
                    {found.slice(0, LIST_LIMIT).map(each => (
                        <li key={each.id}>
                            <WindowPick name={each.name} id={each.id} picked={each.id === id} onPick={() => setParams({ ...(text ? { q: text } : {}), id: each.id }, { replace: true })} />
                        </li>
                    ))}
                </ul>
                {found.length > LIST_LIMIT && <p className="border-t border-line p-3 text-xs text-muted">{`${found.length - LIST_LIMIT} more: narrow the search.`}</p>}
            </Panel>
            {id
                ? (
                        <Panel title={windowName(index, id)} description={<><span className="font-mono">{id}</span>{` · ${plural(keys.length, 'text')}`}</>}>
                            <ul className="divide-y divide-line">{keys.map(key => <KeyedRow key={key} textKey={key} />)}</ul>
                        </Panel>
                    )
                : <EmptyState framed>Pick a window to see and edit every text it shows.</EmptyState>}
        </div>
    );
};

/** Find a text by what players see (or its key), with the windows that show it. */
const ByShown = ({ index }: { index: TemplateIndex }) => {
    const [ params, setParams ] = useSearchParams();
    const [ text, setText ] = useState(() => params.get('q') ?? '');
    const words = useDebounced(text).trim();
    const { data, error } = useTextSearch(words.length >= 2 ? words : '', 0);
    const where = useMemo(() => {
        const found = new Map<string, { id: string; name: string }[]>();

        for (const [ id, keys ] of textsByWindow(index)) for (const key of keys) found.set(key, [ ...(found.get(key) ?? []), { id, name: windowName(index, id) } ]);

        return found;
    }, [ index ]);

    return (
        <Panel title="Texts">
            <div className="p-3">
                <SearchInput
                    value={text}
                    onValueChange={(next) => {
                        setText(next);
                        setParams(next ? { q: next } : {}, { replace: true });
                    }}
                    placeholder="What the text says, or its key"
                />
            </div>
            {error && <div className="p-4"><ErrorNotice error={error} /></div>}
            {words.length < 2 && <EmptyState>Type what a window shows (Earnings, Help, Catalogue) or a text key: the texts are listed with the windows showing them.</EmptyState>}
            {words.length >= 2 && !data && !error && <Loading />}
            {data && words.length >= 2 && data.items.length === 0 && <EmptyState>No text says that.</EmptyState>}
            {words.length >= 2 && (
                <ul className="divide-y divide-line">
                    {/* The texts a window shows first: those are the ones a designer means. */}
                    {[ ...(data?.items ?? []) ].sort((a, b) => Number(where.has(b.key)) - Number(where.has(a.key))).map(entry => <TextRow key={entry.key} textKey={entry.key} entry={entry} where={where.get(entry.key)} />)}
                </ul>
            )}
        </Panel>
    );
};

/** The texts windows show, found by the window or by what players see, edited in place. */
export const AppearanceTextsPage = () => {
    const [ tab, toTab ] = usePathTab(TABS.map(x => x.value));
    const hubTabs = useHubTabs('themes');
    const navigate = useNavigate();
    const { data: index, error } = useTemplateIndex();

    if (toTab) return toTab;

    return (
        <>
            <PageHeader title="Texts" tabs={hubTabs}>
                <ButtonLink to="/gamedata/texts" icon={<Languages />}>All texts</ButtonLink>
            </PageHeader>
            <PageBody>
                {/* The header's tabs are the themes' pages: by window or by shown text is chosen here. */}
                <div className="self-start">
                    <Segmented label="Find texts" value={tab} onChange={value => void navigate(TABS.find(x => x.value === value)!.to, { replace: true })} options={TABS} />
                </div>
                {error && <ErrorNotice error={error} />}
                {!index && !error && <Loading />}
                {index && (tab === 'windows' ? <ByWindow index={index} /> : <ByShown index={index} />)}
            </PageBody>
        </>
    );
};
