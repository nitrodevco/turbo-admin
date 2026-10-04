/**
 * Passkeys in the browser. The server sends WebAuthn options as JSON with binary values in
 * base64url (Fido2's own serialization); the browser API wants them as buffers, and its answer
 * goes back as the JSON `PublicKeyCredential.toJSON()` defines. These convert both ways by hand,
 * so it works in browsers that predate the built-in JSON helpers.
 */

/** A passkey prompt the server opened: its id, and the options for the browser. */
export interface Ceremony<TOptions> {
    ceremonyId: string;
    options: TOptions;
}

type Json = Record<string, unknown>;

const fromBase64Url = (value: string): ArrayBuffer => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i);

    return bytes.buffer;
};

const toBase64Url = (buffer: ArrayBuffer): string => {
    let binary = '';

    for (const byte of new Uint8Array(buffer))
        binary += String.fromCharCode(byte);

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const descriptors = (list: unknown) =>
    Array.isArray(list)
        ? list.map((entry: Json) => ({ ...entry, id: fromBase64Url(entry.id as string) }) as PublicKeyCredentialDescriptor)
        : undefined;

/** Explains a browser's refusal in words; the browser's own are written for developers. */
const explain = (error: unknown): Error => {
    if (error instanceof DOMException) {
        switch (error.name) {
            case 'NotAllowedError':
                return new Error('The passkey prompt was closed or timed out. Try again.');
            case 'InvalidStateError':
                return new Error('That device already holds a passkey for this account.');
            case 'SecurityError':
                return new Error('Passkeys only work on the panel\'s own address, over HTTPS (or localhost).');
            case 'NotSupportedError':
                return new Error('This browser or device cannot make passkeys.');
        }
    }

    return error instanceof Error ? error : new Error('The passkey did not work.');
};

export const passkeysSupported = () => typeof window.PublicKeyCredential === 'function';

/** Makes a passkey from the server's creation options, and returns the answer for the server. */
export const createPasskey = async (options: Json): Promise<Json> => {
    const user = options.user as Json;
    const publicKey = {
        ...options,
        challenge: fromBase64Url(options.challenge as string),
        user: { ...user, id: fromBase64Url(user.id as string) },
        excludeCredentials: descriptors(options.excludeCredentials),
    } as PublicKeyCredentialCreationOptions;

    let credential: PublicKeyCredential;

    try {
        credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
    } catch (error) {
        throw explain(error);
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    return {
        id: credential.id,
        rawId: toBase64Url(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: toBase64Url(response.clientDataJSON),
            attestationObject: toBase64Url(response.attestationObject),
            transports: response.getTransports?.() ?? [],
        },
        clientExtensionResults: credential.getClientExtensionResults(),
    };
};

/** Signs in with a passkey from the server's request options, and returns the answer for the server. */
export const getPasskey = async (options: Json): Promise<Json> => {
    const publicKey = {
        ...options,
        challenge: fromBase64Url(options.challenge as string),
        allowCredentials: descriptors(options.allowCredentials),
    } as PublicKeyCredentialRequestOptions;

    let credential: PublicKeyCredential;

    try {
        credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
    } catch (error) {
        throw explain(error);
    }

    const response = credential.response as AuthenticatorAssertionResponse;

    return {
        id: credential.id,
        rawId: toBase64Url(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: toBase64Url(response.clientDataJSON),
            authenticatorData: toBase64Url(response.authenticatorData),
            signature: toBase64Url(response.signature),
            userHandle: response.userHandle ? toBase64Url(response.userHandle) : null,
        },
        clientExtensionResults: credential.getClientExtensionResults(),
    };
};
