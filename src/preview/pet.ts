/**
 * Pets as the client draws them, from the hotel's nitro-imager (`Turbo:Admin:ImagerUrl`): an image
 * of a pet type in one of its palettes.
 */

export interface PetOptions {
    /** `s` small, `n` normal (the room's), `l` large. */
    size?: 's' | 'n' | 'l';
    direction?: number;
    headOnly?: boolean;
    /** The colour the palette is tinted with, as hex; left out, none. */
    color?: string;
}

/** An imager url for a pet type in a palette; null without an imager. The imager's `/pet` parameters. */
export const petUrl = (imager: string | undefined, typeId: number, paletteId: number, options: PetOptions = {}) => {
    if (!imager)
        return null;

    const params = new URLSearchParams({ type: String(typeId), palette: String(paletteId), size: options.size ?? 'n', direction: String(options.direction ?? 2) });

    if (options.headOnly) params.set('headonly', '1');
    if (options.color) params.set('color', options.color.replace(/^#/, ''));

    return `${imager}/pet?${params}`;
};
