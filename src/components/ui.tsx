import { CheckCircle2, Menu, XCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

import { useDrawer } from '#/layout/drawer';
import { cx } from '#/lib/cx';

import { BackArrow } from './BackArrow';
import { type TabItem, Tabs } from './Tabs';

interface PageHeaderProps {
    title: string;
    icon: ReactNode;
    /** A line under the title: what the page shows right now, or what it is for. */
    description?: ReactNode;
    /** Where the arrow before the title goes, for a page under another (a room, under Rooms). */
    back?: { to: string; label: string };
    /**
     * The page's tabs, under the header. A page without them shows its own name there, as a tab;
     * `tab` names that tab when the title is not the right name for it.
     */
    tabs?: { items: TabItem[]; value: string; onChange?: (value: string) => void };
    tab?: string;
    /** Buttons and badges on the right. */
    children?: ReactNode;
}

/**
 * The top of every page, as nitro-studio has it: the menu button on a phone, the page's icon,
 * title and description, its actions on the right, and its tabs (or its name, as one) under them.
 */
export const PageHeader = ({ title, icon, description, back, tabs, tab, children }: PageHeaderProps) => {
    const openDrawer = useDrawer(state => state.setOpen);

    return (
        <header className="flex shrink-0 flex-col border-b border-line bg-surface px-4 sm:px-6">
            <div className="flex h-17 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={() => openDrawer(true)}
                        aria-label="Open menu"
                        className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-subtle hover:text-ink lg:hidden [&>svg]:size-5"
                    >
                        <Menu />
                    </button>
                    <BackArrow back={back} />
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent max-sm:hidden [&>svg]:size-5">{icon}</div>
                    <div className="min-w-0">
                        <h1 className="truncate text-lg leading-7 font-semibold tracking-tight">{title}</h1>
                        {description && <p className="h-5 truncate text-[13px] leading-5 text-muted">{description}</p>}
                    </div>
                </div>
                {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
            </div>
            {tabs
                ? <Tabs value={tabs.value} tabs={tabs.items} onChange={tabs.onChange} rule={false} className="h-10 items-end" />
                : (
                        <div className="flex h-10 items-end">
                            <span className="relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent [&>svg]:size-4">
                                {icon}
                                {tab ?? title}
                            </span>
                        </div>
                    )}
        </header>
    );
};

/** The page under its header. */
export const PageBody = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cx('animate-rise px-4 py-4 sm:px-6 sm:py-5', className)}>{children}</div>
);

interface PanelProps {
    title?: ReactNode;
    /** A short line under the title. */
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}

export const Panel = ({ title, description, actions, children, className }: PanelProps) => (
    <section className={cx('rounded-lg border border-line bg-surface shadow-sm', className)}>
        {(title || actions) && (
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3">
                <div className="min-w-0">
                    {title && <h2 className="text-sm font-semibold">{title}</h2>}
                    {description && <div className="mt-0.5 text-xs text-muted">{description}</div>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </header>
        )}
        {children}
    </section>
);

export const Stat = ({ label, value, detail, icon, tone }: { label: string; value: ReactNode; detail?: ReactNode; icon?: ReactNode; tone?: string }) => (
    <div className="group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm">
        {icon && (
            <div className={cx('grid size-10 shrink-0 place-items-center rounded-xl transition group-hover:scale-110 group-hover:-rotate-3 [&>svg]:size-5', tone ? `${tone} text-white shadow-sm` : 'bg-accent-soft text-accent')}>
                {icon}
            </div>
        )}
        <div className="min-w-0">
            <div className="text-xs text-muted">{label}</div>
            <div className="text-xl font-semibold tabular-nums">{value}</div>
            {detail && <div className="mt-0.5 truncate text-xs text-muted">{detail}</div>}
        </div>
    </div>
);

type BadgeTone = 'neutral' | 'accent' | 'green' | 'amber' | 'red';

const BADGE_TONES: Record<BadgeTone, string> = {
    neutral: 'bg-subtle text-muted ring-line',
    accent: 'bg-accent-soft text-accent ring-accent/20',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900',
};

export const Badge = ({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) => (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', BADGE_TONES[tone], className)}>
        {children}
    </span>
);

export const ErrorNotice = ({ error }: { error: unknown }) => (
    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <XCircle className="mt-0.5 size-4 shrink-0" />
        <span>{error instanceof Error ? error.message : 'Something went wrong.'}</span>
    </div>
);

export const SuccessNotice = ({ children }: { children: ReactNode }) => (
    <div role="status" className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">{children}</div>
    </div>
);

export const WarningNotice = ({ children }: { children: ReactNode }) => (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        {children}
    </div>
);

export const Loading = () => (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-muted">
        <span className="inline-flex items-center gap-1" aria-hidden>
            {[ 0, 1, 2 ].map(index => (
                <span key={index} className="size-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${index * 0.15}s` }} />
            ))}
        </span>
        Loading
    </div>
);

/** The look every text box and drop-down shares. */
export const FIELD_CLASS = 'h-9 rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-zinc-400 shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-subtle disabled:text-muted';

export const Input = ({ className, ...input }: InputHTMLAttributes<HTMLInputElement>) => (
    <input {...input} className={cx(FIELD_CLASS, className ?? 'w-full')} />
);

export const Select = ({ className, ...select }: SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...select} className={cx(FIELD_CLASS, className)} />
);

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    hint?: string;
}

export const Field = ({ label, hint, id, ...input }: FieldProps) => {
    const fieldId = id ?? input.name;

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId} className="text-xs font-medium text-muted">{label}</label>
            <Input id={fieldId} {...input} />
            {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
    );
};

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-white shadow-sm hover:bg-accent-hover hover:shadow-md hover:shadow-accent/25',
    secondary: 'border border-line bg-surface text-ink shadow-sm hover:bg-subtle',
    ghost: 'text-muted hover:bg-subtle hover:text-ink',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
};

export const Button = ({ variant = 'primary', icon, className, children, ...button }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; icon?: ReactNode }) => (
    <button
        type="button"
        {...button}
        className={cx(
            'inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3.5 text-sm font-medium whitespace-nowrap transition active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4',
            BUTTON_VARIANTS[variant],
            className,
        )}
    >
        {icon}
        {children}
    </button>
);

/** A table header cell and body cell, as nitro-studio's tables have them. */
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
    <th className={cx('border-b border-line bg-subtle px-4 py-2 text-left text-xs font-medium text-muted', className)}>{children}</th>
);

export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
    <td className={cx('border-b border-line px-4 py-2 align-middle', className)}>{children}</td>
);

export const EmptyState = ({ children }: { children: ReactNode }) => <p className="px-4 py-6 text-sm text-muted">{children}</p>;
