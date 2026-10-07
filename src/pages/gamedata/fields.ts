export type FieldKind = 'text' | 'int' | 'number' | 'bool' | 'colors';

export interface FieldInfo {
    key: string;
    label: string;
    kind: FieldKind;
    /** Only a floor item has it. */
    floor?: boolean;
}

/** The furnidata fields a definition holds, as the server's FurnitureFields lists them. */
export const FIELDS: FieldInfo[] = [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'description', label: 'Description', kind: 'text' },
    { key: 'category', label: 'Category', kind: 'text' },
    { key: 'furniline', label: 'Furni line', kind: 'text' },
    { key: 'environment', label: 'Environment', kind: 'text' },
    { key: 'revision', label: 'Revision', kind: 'int' },
    { key: 'specialtype', label: 'Special type', kind: 'int' },
    { key: 'defaultdir', label: 'Default direction', kind: 'int', floor: true },
    { key: 'xdim', label: 'Width (xdim)', kind: 'int', floor: true },
    { key: 'ydim', label: 'Length (ydim)', kind: 'int', floor: true },
    { key: 'height', label: 'Height', kind: 'number', floor: true },
    { key: 'partcolors', label: 'Part colours', kind: 'colors', floor: true },
    { key: 'adurl', label: 'Ad URL', kind: 'text' },
    { key: 'customparams', label: 'Custom params', kind: 'text', floor: true },
    { key: 'canstandon', label: 'Can stand on', kind: 'bool', floor: true },
    { key: 'cansiton', label: 'Can sit on', kind: 'bool', floor: true },
    { key: 'canlayon', label: 'Can lay on', kind: 'bool', floor: true },
    { key: 'canputstuffon', label: 'Can put stuff on', kind: 'bool', floor: true },
    { key: 'tradeable', label: 'Tradeable', kind: 'bool' },
    { key: 'recyclable', label: 'Recyclable', kind: 'bool' },
    { key: 'states', label: 'States (from its file)', kind: 'int' },
    { key: 'rare', label: 'Rare', kind: 'bool' },
    { key: 'excludeddynamic', label: 'Excluded dynamic', kind: 'bool' },
];
