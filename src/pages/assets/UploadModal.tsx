import { FileUp, Upload } from 'lucide-react';
import { useState } from 'react';

import { type AssetBundle, BUNDLE_KINDS, type BundleKind, useUploadBundle } from '#/api/bundles';
import { Modal } from '#/components/Modal';
import { toast } from '#/components/toast';
import { Button, ErrorNotice, Input, Labeled, Segmented } from '#/components/ui';

import { formatBytes } from './format';

/** A file's name without its extension: the bundle's name unless another is given. */
const baseName = (file: File | null) => file?.name.replace(/\.[^.]+$/, '') ?? '';

/**
 * Uploads a library: a Flash `.swf` or `.hab`, converted on the server, or a `.nitro` kept as it
 * is. It is kept as an upload, which a sync never replaces.
 */
export const UploadModal = ({ open, kind: startKind, onClose, onUploaded }: { open: boolean; kind: BundleKind; onClose: () => void; onUploaded: (bundle: AssetBundle) => void }) => {
    const [ file, setFile ] = useState<File | null>(null);
    const [ kind, setKind ] = useState<BundleKind>(startKind);
    const [ name, setName ] = useState('');
    const upload = useUploadBundle();

    const close = () => {
        setFile(null);
        setName('');
        upload.reset();
        onClose();
    };

    return (
        <Modal open={open} onClose={close} title="Upload a bundle" className="sm:h-fit! sm:max-w-lg">
            <form
                className="flex flex-col gap-4 p-4 sm:p-5"
                onSubmit={(event) => {
                    event.preventDefault();

                    if (!file)
                        return;

                    upload.mutate({ file, kind, name }, {
                        onSuccess: (bundle) => {
                            toast(`Uploaded ${bundle.name}.`);
                            close();
                            onUploaded(bundle);
                        },
                    });
                }}
            >
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-4 py-6 text-center hover:border-accent focus-within:border-accent">
                    <FileUp className="size-6 text-muted" aria-hidden />
                    {file
                        ? <span className="max-w-full truncate font-mono text-sm">{`${file.name} (${formatBytes(file.size)})`}</span>
                        : <span className="text-sm">Choose a .swf, .hab or .nitro file</span>}
                    <span className="text-xs text-muted">A Flash library is converted on the server; a .nitro is kept as it is.</span>
                    <input
                        type="file"
                        accept=".swf,.hab,.nitro"
                        className="sr-only"
                        onChange={event => setFile(event.target.files?.[0] ?? null)}
                    />
                </label>

                <Labeled label="Kind">
                    <Segmented label="Kind" value={kind} onChange={value => setKind(value as BundleKind)} options={BUNDLE_KINDS.map(x => ({ value: x.value, label: x.label }))} />
                </Labeled>

                <Labeled label="Name" hint={kind === 'effect' ? 'The effect map\'s lib.' : kind === 'pet' ? 'The name pet.configuration lists.' : kind === 'figure' ? 'The figure map\'s lib, as hh_human_body or shirt_U_tee.' : 'The class name, without its *colour.'}>
                    <Input value={name} onChange={event => setName(event.target.value)} placeholder={baseName(file) || 'The file\'s name'} className="w-full font-mono" />
                </Labeled>

                {upload.error && <ErrorNotice error={upload.error} />}

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={close}>Cancel</Button>
                    <Button type="submit" icon={<Upload />} disabled={!file || upload.isPending}>{upload.isPending ? 'Uploading' : 'Upload'}</Button>
                </div>
            </form>
        </Modal>
    );
};
