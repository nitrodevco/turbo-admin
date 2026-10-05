import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, Unlink } from 'lucide-react';

import { endSiteSessions, type PlayerDiscordInfo, unlinkDiscord } from '#/api/players';
import { Button, ErrorNotice, Kv, Panel } from '#/components/ui';
import { formatDateTime } from '#/pages/rooms/labels';

/**
 * The Discord account a player signs in to the public site with, and what staff with
 * `admin.accounts.manage` can do about it: sign them out of the site everywhere, or unlink the
 * account, which also signs them out and lets that Discord account sign up afresh. Neither touches
 * a game session or a login ticket.
 */
export const DiscordCard = ({ playerId, playerName, discord, canManage }: { playerId: number; playerName: string; discord: PlayerDiscordInfo; canManage: boolean }) => {
    const queryClient = useQueryClient();
    const refresh = () => void queryClient.invalidateQueries({ queryKey: [ 'player', playerId ] });
    const signOut = useMutation({ mutationFn: () => endSiteSessions(playerId), onSettled: refresh });
    const unlink = useMutation({ mutationFn: () => unlinkDiscord(playerId), onSettled: refresh });

    return (
        <Panel title="Discord" description="How they sign in to the public site.">
            <dl>
                <Kv label="Username">@{discord.username}</Kv>
                <Kv label="Discord id"><span className="font-mono text-xs">{discord.id}</span></Kv>
                <Kv label="Linked">{formatDateTime(discord.linkedAtUtc)}</Kv>
                <Kv label="Signed in on the site">{discord.activeSignIns === 0 ? 'nowhere' : `${discord.activeSignIns} ${discord.activeSignIns === 1 ? 'browser' : 'browsers'}`}</Kv>
            </dl>
            {canManage && (
                <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                    <Button
                        variant="secondary"
                        icon={<LogOut />}
                        disabled={signOut.isPending || discord.activeSignIns === 0}
                        onClick={() => window.confirm(`Sign ${playerName} out of the site everywhere?`) && signOut.mutate()}
                    >
                        Sign out of the site
                    </Button>
                    <Button
                        variant="danger"
                        icon={<Unlink />}
                        disabled={unlink.isPending}
                        onClick={() => window.confirm(`Unlink @${discord.username} from ${playerName}? They can't sign in to the site with it any more, and it could sign up as a new player.`) && unlink.mutate()}
                    >
                        Unlink Discord
                    </Button>
                </div>
            )}
            {(signOut.error ?? unlink.error) && <div className="px-4 pb-3"><ErrorNotice error={signOut.error ?? unlink.error} /></div>}
        </Panel>
    );
};
