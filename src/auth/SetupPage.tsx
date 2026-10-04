import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { post } from '#/api/client';
import type { SessionResponse, SetupInfoResponse } from '#/api/types';
import { AuthCard } from '#/components/AuthCard';
import { Button, ErrorNotice, Field, WarningNotice } from '#/components/ui';

import { toSession, useSession } from './session';
import { type Ceremony, createPasskey, passkeysSupported } from './webauthn';

/** What a device is likely called, as a starting name for its passkey. */
const guessDeviceName = () => {
    const agent = navigator.userAgent;

    if (/iPhone/.test(agent))
        return 'iPhone';

    if (/iPad/.test(agent))
        return 'iPad';

    if (/Android/.test(agent))
        return 'Android phone';

    if (/Mac OS X/.test(agent))
        return 'Mac';

    if (/Windows/.test(agent))
        return 'Windows PC';

    return 'This device';
};

/**
 * Where a setup link lands (`/setup#token=...`): the player makes the passkey they will sign in
 * with, from any browser, and is signed in. The token is read once and taken out of the address
 * bar; finishing spends it, and replaces any passkeys the player had.
 */
export const SetupPage = () => {
    const navigate = useNavigate();
    const signIn = useSession(state => state.signIn);
    const [ token ] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token'));
    const [ info, setInfo ] = useState<SetupInfoResponse | null>(null);
    const [ deviceName, setDeviceName ] = useState(guessDeviceName);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState<unknown>(token === null ? new Error('This page needs a setup link. Ask an admin for one.') : null);

    useEffect(() => {
        if (token === null)
            return;

        window.history.replaceState(null, '', window.location.pathname);

        post<SetupInfoResponse>('/setup/info', { token })
            .then(setInfo)
            .catch(setError);
    }, [ token ]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (token === null || info === null)
            return;

        setError(null);
        setBusy(true);

        try {
            const ceremony = await post<Ceremony<Record<string, unknown>>>('/setup/passkey', { token });
            const credential = await createPasskey(ceremony.options);
            const response = await post<SessionResponse>('/setup/complete', {
                token,
                ceremonyId: ceremony.ceremonyId,
                credential,
                passkeyName: deviceName,
            });

            signIn(toSession(response));
            navigate('/', { replace: true });
        } catch (reason) {
            setError(reason);
            setBusy(false);
        }
    };

    return (
        <AuthCard title={info?.replacesExisting ? 'Replace your passkey' : 'Set up your passkey'}>
            {error !== null && <div className="mb-4"><ErrorNotice error={error} /></div>}
            {info && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-muted">
                        You will sign in as
                        {' '}
                        <strong className="text-ink">{info.playerName}</strong>
                        {' '}
                        with a passkey, and nothing else: Face ID, Touch ID, Windows Hello, your phone or a security key.
                    </p>
                    {info.replacesExisting && (
                        <WarningNotice>
                            This removes all your current passkeys. Only the one you make now will sign you in.
                        </WarningNotice>
                    )}
                    {!passkeysSupported() && <ErrorNotice error={new Error('This browser cannot make passkeys. Open the link in another browser.')} />}
                    <Field
                        label="Name for this passkey"
                        name="device"
                        value={deviceName}
                        onChange={event => setDeviceName(event.target.value)}
                        maxLength={64}
                        hint="So you can tell your passkeys apart later."
                    />
                    <Button type="submit" className="w-full" disabled={busy || !passkeysSupported()}>
                        {busy ? 'Waiting for your passkey...' : 'Create passkey and sign in'}
                    </Button>
                </form>
            )}
            {!info && error === null && <p className="text-sm text-muted">Checking your setup link...</p>}
        </AuthCard>
    );
};
