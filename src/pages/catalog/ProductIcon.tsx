import { Bot, Box, Crown, PawPrint, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { badgeUrl, furniIconUrl, useClientAssets } from '#/api/assets';
import type { ProductKind } from '#/api/catalog';
import { Thumb } from '#/components/ui';
import { cx } from '#/lib/cx';

const GLYPHS: Partial<Record<ProductKind, typeof Bot>> = { effect: Sparkles, robot: Bot, pet: PawPrint, club: Crown };

/**
 * What a product looks like in the client: a furniture's icon or a badge; an effect, a bot, a pet or
 * a membership gets a symbol. An image the client's host doesn't have leaves the space empty, so
 * rows stay lined up.
 */
export const ProductIcon = ({ type, name, className }: { type: ProductKind; name: string | null; className?: string }) => {
    const assets = useClientAssets();
    const url = type === 'badge' ? badgeUrl(assets, name) : (type === 'floor' || type === 'wall') ? furniIconUrl(assets, name) : null;
    const [ failed, setFailed ] = useState<string | null>(null);
    const Glyph = GLYPHS[type];

    return (
        <span className={cx('grid size-8 shrink-0 place-items-center', className)}>
            {url && failed !== url && <img key={url} src={url} alt="" loading="lazy" className="max-h-full max-w-full [image-rendering:pixelated]" onError={() => setFailed(url)} />}
            {!url && Glyph && <Glyph className="size-1/2 min-h-4 min-w-4 text-accent" aria-hidden />}
        </span>
    );
};

/**
 * A furniture's icon in a `Thumb`, before its class name in a list of furniture (the hotel's, a
 * room's); a box where the client's host has no icon for it.
 */
export const FurniThumb = ({ name }: { name: string }) => {
    const assets = useClientAssets();
    const url = furniIconUrl(assets, name);
    const [ failed, setFailed ] = useState<string | null>(null);

    return (
        <Thumb>
            {url && failed !== url
                ? <img key={url} src={url} alt="" loading="lazy" className="max-h-[85%] max-w-[85%] [image-rendering:pixelated]" onError={() => setFailed(url)} />
                : <Box className="size-4 text-muted" aria-hidden />}
        </Thumb>
    );
};
