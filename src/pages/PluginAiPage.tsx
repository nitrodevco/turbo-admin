import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { type AiProvider, setAiKey, testAi, useAi } from '#/api/ai';
import { type ServerSetting, useSaveSetting, useSettings } from '#/api/settings';
import { toast, toastError } from '#/components/toast';
import { Badge, Button, EmptyState, ErrorNotice, Input, Label, Loading, PageBody, PageHeader, Panel, Select, Td, Textarea, Th } from '#/components/ui';
import { useHubTabs } from '#/layout/nav';

const Provider = ({ provider, canManage }: { provider: AiProvider; canManage: boolean }) => {
    const [ key, setKey ] = useState('');
    const client = useQueryClient();
    const change = useMutation({
        mutationFn: (value: string | null) => setAiKey(provider.name, value),
        onSuccess: () => {
            setKey('');
            toast('Key updated.');
            void client.invalidateQueries({ queryKey: [ 'plugins', 'ai' ] });
        },
        onError: toastError,
    });
    const test = useMutation({ mutationFn: () => testAi(provider.name), onError: toastError });

    return (
        <li className="flex flex-col gap-3 border-t border-line px-4 py-3 first:border-t-0">
            <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    <Badge tone={provider.usable ? 'green' : 'amber'}>{provider.usable ? 'ready' : 'needs configuration'}</Badge>
                </div>
                <span className="font-mono text-2xs text-muted">{provider.driver} · {provider.model} · {provider.hasKey ? 'key set' : 'no key'}</span>
                {provider.url && <span className="font-mono text-2xs break-all text-muted">{provider.url}</span>}
            </div>
            {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                    <Input aria-label={`New key for ${provider.name}`} type="password" autoComplete="new-password" value={key} onChange={event => setKey(event.target.value)} placeholder="New API key" className="w-full sm:w-64" />
                    <Button disabled={!key.trim() || change.isPending} onClick={() => change.mutate(key)}>Save key</Button>
                    <Button variant="secondary" disabled={!provider.hasKey || change.isPending} onClick={() => change.mutate(null)}>Remove key</Button>
                    <Button variant="secondary" disabled={test.isPending} onClick={() => test.mutate()}>{test.isPending ? 'Testing…' : 'Test connection'}</Button>
                </div>
            )}
            {test.data && <p role="status" className={test.data.ok ? 'text-xs text-muted' : 'text-xs text-bad'}>{test.data.message}</p>}
        </li>
    );
};

const Setting = ({ setting, canManage }: { setting: ServerSetting; canManage: boolean }) => {
    const [ value, setValue ] = useState(setting.value ?? setting.default ?? '');
    const save = useSaveSetting();
    const client = useQueryClient();

    return (
        <form
            className="flex flex-col gap-1.5 border-t border-line px-4 py-3 first:border-t-0"
            onSubmit={(event) => {
                event.preventDefault();
                try {
                    JSON.parse(value);
                    save.mutate({ path: setting.path, value }, {
                        onSuccess: () => {
                            toast('Setting saved.');
                            void client.invalidateQueries({ queryKey: [ 'plugins', 'ai' ] });
                        },
                        onError: toastError,
                    });
                } catch {
                    toastError(new Error('Enter a valid JSON value.'));
                }
            }}
        >
            <label htmlFor={setting.path} className="font-mono text-ui font-medium">{setting.path.split(':').at(-1)}</label>
            {setting.summary && <p className="text-xs text-muted">{setting.summary}</p>}
            {!setting.live && <p className="text-xs text-warn">Applies after a server restart.{setting.pendingRestart ? ' A restart is pending.' : ''}</p>}
            <Textarea id={setting.path} value={value} readOnly={!canManage} rows={setting.kind === 'map' ? 10 : 2} onChange={event => setValue(event.target.value)} className="mt-1 w-full font-mono" />
            {canManage && <Button type="submit" variant="secondary" disabled={save.isPending} className="self-start">Save</Button>}
        </form>
    );
};

export const PluginAiPage = () => {
    const [ days, setDays ] = useState(30);
    const { data, error, isPending } = useAi(days);
    const settings = useSettings();
    const tabs = useHubTabs('plugins');
    const canManage = settings.data?.canManage ?? false;
    const aiSettings = settings.data?.settings.filter(setting => setting.section === 'Turbo:Ai' && !setting.secret);

    return (
        <>
            <PageHeader title="Plugins" description="Language models, access and usage" tabs={tabs} />
            <PageBody>
                {error && <ErrorNotice error={error} />}
                {isPending && <Loading />}
                {!isPending && !data && !error && <EmptyState>The server has no AI module.</EmptyState>}
                {data && (
                    <>
                        <Panel title="Providers" description={`Failover: ${data.failover.length ? data.failover.join(' → ') : 'every provider by name'}`}>
                            {!data.providers.length && <EmptyState>Add a provider below to get started.</EmptyState>}
                            {data.providers.length > 0 && <ul>{data.providers.map(provider => <Provider key={provider.name} provider={provider} canManage={canManage} />)}</ul>}
                        </Panel>
                        <Panel title="Plugin access">
                            {!data.plugins.length && <EmptyState>No loaded plugin declares AI.</EmptyState>}
                            {data.plugins.length > 0 && (
                                <ul>
                                    {data.plugins.map(plugin => (
                                        <li key={plugin.key} className="flex items-start gap-3 border-t border-line px-4 py-3 first:border-t-0">
                                            <div className="min-w-0 flex-1">
                                                <span className="block font-medium">{plugin.name}</span>
                                                <span className="block text-xs text-muted">{plugin.purpose}</span>
                                            </div>
                                            <Badge tone={plugin.allowed ? 'green' : 'red'}>{plugin.allowed ? 'allowed' : 'blocked'}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                        <Panel title="Configuration" description="Providers, models, failover, allowed plugin keys and limits. Values use JSON. API keys are entered above.">
                            {settings.error && <div className="p-4"><ErrorNotice error={settings.error} /></div>}
                            {settings.isPending && <Loading />}
                            {aiSettings?.length === 0 && <EmptyState>The server has no AI settings to show.</EmptyState>}
                            {aiSettings?.map(setting => <Setting key={`${setting.path}:${setting.value}`} setting={setting} canManage={canManage} />)}
                        </Panel>
                        <Panel
                            title="Usage"
                            actions={(
                                <label className="flex items-center gap-2">
                                    <Label>Period</Label>
                                    <Select aria-label="Usage period" value={String(days)} onChange={event => setDays(Number(event.target.value))}>
                                        <option value={7}>7 days</option>
                                        <option value={30}>30 days</option>
                                        <option value={90}>90 days</option>
                                    </Select>
                                </label>
                            )}
                            className="overflow-clip"
                        >
                            {!data.usage.length && <EmptyState>No usage in this period.</EmptyState>}
                            {data.usage.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr>
                                                <Th>UTC day</Th>
                                                <Th>Plugin</Th>
                                                <Th>Provider / model</Th>
                                                <Th className="text-right">Calls / failed</Th>
                                                <Th className="text-right">Tokens in / out</Th>
                                                <Th className="text-right">Cost</Th>
                                            </tr>
                                        </thead>
                                        <tbody className="[&>tr:last-child>td]:border-b-0">
                                            {data.usage.map(row => (
                                                <tr key={`${row.day}:${row.plugin}:${row.provider}:${row.model}`} className="hover:bg-subtle/60">
                                                    <Td className="font-mono text-xs whitespace-nowrap">{row.day.slice(0, 10)}</Td>
                                                    <Td>{row.plugin}</Td>
                                                    <Td>{row.provider} <span className="text-muted">/ {row.model}</span></Td>
                                                    <Td className="text-right font-mono tabular-nums">{row.calls.toLocaleString()} <span className="text-muted">/ {row.failed.toLocaleString()}</span></Td>
                                                    <Td className="text-right font-mono tabular-nums">{row.inputTokens.toLocaleString()} <span className="text-muted">/ {row.outputTokens.toLocaleString()}</span></Td>
                                                    <Td className="text-right font-mono tabular-nums">{row.cost.toLocaleString(undefined, { maximumFractionDigits: 6 })}</Td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>
                    </>
                )}
            </PageBody>
        </>
    );
};
