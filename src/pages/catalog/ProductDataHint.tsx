import { useDeferredValue } from 'react';

import { useProductLookup, useProductSuggestions } from '#/api/gamedata';

/**
 * What the client shows for an offer whose name key is this code: the product data's name and
 * description - or, with none, the furniture's own name. With the codes product data has that
 * start like it, to pick from (<c>listId</c>, for the name key's input).
 */
export const ProductDataHint = ({ code, listId }: { code: string; listId: string }) => {
    const typed = useDeferredValue(code.trim());
    const { data: found } = useProductLookup(typed ? [ typed ] : []);
    const { data: suggestions } = useProductSuggestions(typed);
    const product = found?.find(x => x.code === typed);

    return (
        <>
            <datalist id={listId}>
                {suggestions?.map(x => <option key={x.code} value={x.code}>{x.name ?? ''}</option>)}
            </datalist>
            {typed && (
                <span className="text-xs text-muted">
                    {product
                        ? <>Shown as <span className="text-ink">{product.name || '(no name)'}</span>{product.description ? <> - {product.description}</> : null}</>
                        : 'No product data for this key: the client shows the furniture’s own name.'}
                </span>
            )}
        </>
    );
};
