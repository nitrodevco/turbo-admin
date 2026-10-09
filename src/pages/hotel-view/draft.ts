import { useCallback, useMemo, useState } from 'react';

import type { VariableEntry } from '#/api/gamedata';
import { useHotelViewTexts } from '#/api/hotelView';

import { elementTextKeys, parseConf, readValue } from './model';

/**
 * The hotel view being edited: the server's variables and texts with the panel's changes laid
 * over them. A change back to what the server has is no change. Nothing is sent until saved, and
 * then all of it at once.
 */
export interface HotelViewDraft {
    /** Every variable key there will be once saved. */
    keys: string[];
    /** A variable's JSON value as it will be; undefined when there will be none. */
    json: (key: string) => string | undefined;
    /** A variable's value as the client reads it: text, or a number or true/false as text. */
    text: (key: string) => string;
    bool: (key: string) => boolean;
    /** The setting or file a variable follows on the server, if any; a change of value stops it. */
    follows: (key: string) => string | null;
    /** Sets a variable to text; empty removes it, which the client reads as empty all the same. */
    setText: (key: string, value: string) => void;
    setBool: (key: string, value: boolean) => void;
    /** Sets a variable to JSON, or removes it with null. */
    setJson: (key: string, value: string | null) => void;
    /** Several at once, as one step. */
    setMany: (values: Record<string, string | null>) => void;
    /** The text of an external text key as it will be; undefined when the hotel has none. */
    phrase: (key: string) => string | undefined;
    setPhrase: (key: string, value: string | null) => void;
    /** Whether the variable or text differs from the server's. */
    changed: (key: string) => boolean;
    phraseChanged: (key: string) => boolean;
    count: number;
    variables: Record<string, string | null>;
    texts: Record<string, string | null>;
    discard: () => void;
}

export const useHotelViewDraft = (server: VariableEntry[]): HotelViewDraft => {
    const [ variables, setVariables ] = useState<Record<string, string | null>>({});
    const [ texts, setTexts ] = useState<Record<string, string | null>>({});
    const byKey = useMemo(() => new Map(server.map(x => [ x.key, x ])), [ server ]);
    const json = useCallback((key: string) => (key in variables ? (variables[key] ?? undefined) : byKey.get(key)?.value), [ variables, byKey ]);

    const setMany = useCallback((values: Record<string, string | null>) => setVariables((previous) => {
        const next = { ...previous };

        for (const [ key, value ] of Object.entries(values)) {
            const current = byKey.get(key)?.value ?? null;

            // Back to the server's value: no change.
            if (value === current) delete next[key];
            else next[key] = value;
        }

        return next;
    }), [ byKey ]);

    const setJson = useCallback((key: string, value: string | null) => setMany({ [key]: value }), [ setMany ]);

    const keys = useMemo(() => {
        const all = new Set(server.map(x => x.key));

        for (const [ key, value ] of Object.entries(variables)) {
            if (value === null) all.delete(key);
            else all.add(key);
        }

        return [ ...all ].sort();
    }, [ server, variables ]);

    // The texts the widgets show: every element's of every column (a schedule's entries are no
    // element), and the slots' headings.
    const textKeys = useMemo(() => [ ...new Set(keys.flatMap(key => (key.endsWith('.conf')
        ? parseConf(readValue(json(key))).flatMap(elementTextKeys)
        : key.endsWith('.title') ? [ readValue(json(key)) ] : []))) ].filter(Boolean).sort(), [ keys, json ]);
    const { data: serverTexts } = useHotelViewTexts(textKeys);
    const textByKey = useMemo(() => new Map((serverTexts?.texts ?? []).map(x => [ x.key, x.value ])), [ serverTexts ]);

    const phrase = useCallback((key: string) => (key in texts ? (texts[key] ?? undefined) : textByKey.get(key)), [ texts, textByKey ]);

    const setPhrase = useCallback((key: string, value: string | null) => setTexts((previous) => {
        const next = { ...previous };

        if (value === (textByKey.get(key) ?? null)) delete next[key];
        else next[key] = value;

        return next;
    }), [ textByKey ]);

    return {
        keys,
        json,
        text: key => readValue(json(key)),
        bool: key => readValue(json(key)) === 'true',
        follows: key => byKey.get(key)?.setting ?? byKey.get(key)?.file ?? null,
        setText: (key, value) => setJson(key, value === '' ? null : JSON.stringify(value)),
        // Off where there was nothing stays nothing: the client reads a missing one as off.
        setBool: (key, value) => setJson(key, value ? 'true' : byKey.has(key) ? 'false' : null),
        setJson,
        setMany,
        phrase,
        setPhrase,
        changed: key => key in variables,
        phraseChanged: key => key in texts,
        count: Object.keys(variables).length + Object.keys(texts).length,
        variables,
        texts,
        discard: () => {
            setVariables({});
            setTexts({});
        },
    };
};
