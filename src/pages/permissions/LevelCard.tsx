import type { LevelView } from '#/api/permissions';
import { Badge, Panel } from '#/components/ui';

/**
 * The security level the client is sent, and what set it. The client reads the level as a
 * threshold, so it also draws everything at or below it; what the server will refuse of that is
 * listed, as `perm ... info` prints it.
 */
export const LevelCard = ({ level, who }: { level: LevelView; who: string }) => (
    <Panel
        title="Client level"
        description={`What the client is told ${who} may see.`}
    >
        <div className="space-y-3 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
                <Badge tone={level.value > 0 ? 'accent' : 'neutral'}>{level.level} ({level.value})</Badge>
                {level.source && (
                    <span className="text-muted">
                        set by <code className="font-mono text-xs text-ink">{level.source}</code>
                    </span>
                )}
            </div>
            {level.shownButRefused.length > 0 && (
                <div>
                    <p className="text-xs text-muted">The client will also offer these, and the server refuse them:</p>
                    <ul className="mt-1.5 space-y-1">
                        {level.shownButRefused.map(node => (
                            <li key={node.node} className="text-xs">
                                <code className="font-mono">{node.node}</code>
                                <span className="text-muted"> ({node.clientLevel}) {node.description}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </Panel>
);
