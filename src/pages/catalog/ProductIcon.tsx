import { badgeUrl, furniIconUrl, useClientAssets } from '#/api/assets';
import type { ProductKind } from '#/api/catalog';
import { cx } from '#/lib/cx';

/**
 * What a product looks like in the client: a furniture's icon or a badge. Anything else, or an
 * image the client's host doesn't have, leaves the space empty so rows stay lined up.
 */
export const ProductIcon = ({ type, name, className }: { type: ProductKind; name: string | null; className?: string }) => {
    const assets = useClientAssets();
    const url = type === 'badge' ? badgeUrl(assets, name) : (type === 'floor' || type === 'wall') ? furniIconUrl(assets, name) : null;

    return (
        <span className={cx('grid size-8 shrink-0 place-items-center', className)}>
            {url && <img key={url} src={url} alt="" loading="lazy" className="max-h-8 max-w-8 [image-rendering:pixelated]" onError={event => (event.currentTarget.style.display = 'none')} />}
        </span>
    );
};
