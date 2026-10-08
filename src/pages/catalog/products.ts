import type { CatalogProductInput } from '#/api/catalog';

/** A product being edited, with the class name of the item picked for it, to show. */
export interface ProductDraft extends CatalogProductInput {
    key: number;
    definitionName: string | null;
}

let nextKey = 1;

export const productDraft = (input: CatalogProductInput, definitionName: string | null = null): ProductDraft => ({ ...input, key: nextKey++, definitionName });
