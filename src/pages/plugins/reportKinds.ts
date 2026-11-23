import type { PluginClientIssue } from '#/api/plugins';
import type { BadgeTone } from '#/components/ui';

/** What players' clients report of a window's patches, in the order a row reads them, with each kind's word and tone. */
export const REPORT_KINDS = [
    { kind: 'patch.applied', word: 'applied', tone: 'green' },
    { kind: 'patch.unmatched', word: 'unmatched', tone: 'amber' },
    { kind: 'patch.ineffective', word: 'ineffective', tone: 'amber' },
    { kind: 'patch.conflict', word: 'conflict', tone: 'amber' },
] as const satisfies readonly { kind: string; word: string; tone: BadgeTone }[];

/** A client's reports of patches only: a module's failures are the Plugins page's. */
export const patchIssues = (issues: readonly PluginClientIssue[] | undefined) => issues?.filter(issue => issue.kind.startsWith('patch.')) ?? [];

/**
 * The reports that are about one patch: its window's applied figure, and each other report whose
 * element (the client's reason: `name`, `name:what`, `name.property`) one of its ops names.
 */
export const issuesOf = (issues: readonly PluginClientIssue[], template: string, ops: unknown) => {
    const elements = (Array.isArray(ops) ? ops : []).flatMap(op => (op && typeof op === 'object' && typeof (op as { element?: unknown }).element === 'string' ? [ (op as { element: string }).element ] : []));

    return issues.filter(issue => issue.subject === template && (issue.kind === 'patch.applied' || elements.some(element => issue.reason === element || issue.reason.startsWith(`${element}:`) || issue.reason.startsWith(`${element}.`))));
};
