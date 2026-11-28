import { type ReactNode, useState } from 'react';

import { useClientAssets } from '#/api/assets';
import { petUrl } from '#/preview/pet';

import { Thumb } from './ui';

/**
 * A pet type's head in one palette, tinted `color` when it has one, as the client draws it, from
 * the hotel's imager. A pet with no head of its own (a monsterplant) is drawn whole; the well shows
 * `fallback` (nothing, left out) without an imager, or for a type or palette the imager has no art of.
 */
export const PetHead = ({ typeId, paletteId, color, fallback }: { typeId: number; paletteId: number; color?: string; fallback?: ReactNode }) => {
    const imager = useClientAssets()?.imager;
    const head = petUrl(imager, typeId, paletteId, { headOnly: true, color });
    const [ headless, setHeadless ] = useState<string | null>(null);
    const [ failed, setFailed ] = useState<string | null>(null);
    const url = head !== null && headless === head ? petUrl(imager, typeId, paletteId, { color }) : head;

    return (
        <Thumb>
            {url !== null && failed !== url
                ? (
                        <img
                            key={url}
                            src={url}
                            alt=""
                            loading="lazy"
                            className="max-h-full max-w-full object-contain [image-rendering:pixelated]"
                            // The imager answers a pet that has no head with an empty pixel.
                            onLoad={(event) => { if (url === head && event.currentTarget.naturalWidth <= 1) setHeadless(head); }}
                            onError={() => setFailed(url)}
                        />
                    )
                : fallback}
        </Thumb>
    );
};
