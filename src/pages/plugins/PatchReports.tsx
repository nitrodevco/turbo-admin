import { TriangleAlert } from 'lucide-react';

import type { PluginClientIssue } from '#/api/plugins';
import { Badge } from '#/components/ui';

import { REPORT_KINDS } from './reportKinds';

/**
 * How many players' clients report a patch applied, unmatched, ineffective or clashing with another
 * owner's (XenForo's 1/0/0, but live): only the kinds reported, so a row says nothing it does not
 * know; none yet is said in words.
 */
export const ReportCounts = ({ issues }: { issues: readonly PluginClientIssue[] }) => {
    const counted = REPORT_KINDS
        .map(each => ({ ...each, clients: issues.filter(issue => issue.kind === each.kind).reduce((sum, issue) => sum + issue.clients, 0) }))
        .filter(each => each.clients > 0);

    if (counted.length === 0) return <span className="text-xs text-muted">No client reports yet</span>;

    return (
        <span className="inline-flex flex-wrap items-center gap-1" title="How many players' clients report this window's patches applied, unmatched, ineffective or in conflict">
            {counted.map(each => <Badge key={each.kind} tone={each.tone}>{`${each.clients.toLocaleString()} ${each.word}`}</Badge>)}
        </span>
    );
};

/** What clients said of a patch that did not apply, a line each. */
export const ReportWords = ({ issues }: { issues: readonly PluginClientIssue[] }) => issues
    .filter(issue => issue.kind !== 'patch.applied')
    .map(issue => (
        <p key={`${issue.kind}-${issue.reason}`} className="flex items-start gap-1.5 text-xs text-warn">
            <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {issue.message}
        </p>
    ));
