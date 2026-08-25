import { t } from '../utils/gettext';
import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';

import {
  AlertIcon,
  CheckCircleIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  TrashIcon,
} from '../components/Icons';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import type { SafeShieldRulesAction } from '../hooks/useSafeShieldRules';
import type { SafeShieldRuleAction, SafeShieldRules } from '../types/rules';

interface SafeShieldRulesPageProps {
  action: SafeShieldRulesAction | null;
  data: SafeShieldRules | null;
  error: string | null;
  feedback: string | null;
  loading: boolean;
  onAddRule: (
    action: SafeShieldRuleAction,
    domain: string,
  ) => Promise<boolean>;
  onDeleteRule: (
    action: SafeShieldRuleAction,
    domain: string,
  ) => Promise<boolean>;
  onDismissFeedback: () => void;
  onRetry: () => void;
}

interface RuleListCardProps {
  action: SafeShieldRulesAction | null;
  kind: SafeShieldRuleAction;
  onAddRule: (
    action: SafeShieldRuleAction,
    domain: string,
  ) => Promise<boolean>;
  onDeleteRule: (
    action: SafeShieldRuleAction,
    domain: string,
  ) => Promise<boolean>;
  rules: string[];
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/\.+$/, '');
}

function isValidDomain(value: string): boolean {
  if (value.length === 0 || value.length > 253 || !value.includes('.')) {
    return false;
  }

  if (!/^[a-z0-9.-]+$/.test(value)) {
    return false;
  }

  return value.split('.').every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
  );
}

function RuleListCard({
  action,
  kind,
  onAddRule,
  onDeleteRule,
  rules,
}: RuleListCardProps) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const isAllow = kind === 'allow';
  const busy = action !== null;
  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query.length > 0
      ? rules.filter((domain) => domain.includes(query))
      : rules;
  }, [rules, search]);

  async function handleSubmit(
    event: JSX.TargetedSubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const domain = normalizeDomain(input);

    if (!isValidDomain(domain)) {
      setValidationError(
        t('please enter a domain with the format example.com. URLs, IP addresses, and wildcards are not allowed.'),
      );
      return;
    }

    setValidationError(null);
    const saved = await onAddRule(kind, domain);

    if (saved) {
      setInput('');
    }
  }

  const theme = isAllow
    ? {
        badge: 'bg-emerald-100 text-emerald-800',
        button:
          'border-emerald-700 bg-emerald-700 text-white hover:border-emerald-800 hover:bg-emerald-800 focus-visible:ring-emerald-100',
        icon: 'bg-emerald-50 text-emerald-700',
        label: t('Allowlist'),
        description:
          t('Register domains and subdomains that you want to allow even if they are on the blacklist.'),
        empty: t('You don\'t have any allowed domains on file.'),
      }
    : {
        badge: 'bg-red-100 text-red-800',
        button:
          'border-red-700 bg-red-700 text-white hover:border-red-800 hover:bg-red-800 focus-visible:ring-red-100',
        icon: 'bg-red-50 text-red-700',
        label: t('Blocklist'),
        description: t('Register a domain you want to block yourself, even if it\'s not in the SafeShield default list.'),
        empty: t('There are no registered blocking domains.'),
      };

  return (
    <article class="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <div class="border-b border-slate-200 p-4 sm:p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex min-w-0 items-start gap-3">
            <span class={`grid size-11 shrink-0 place-items-center rounded-xl ${theme.icon}`}>
              {isAllow ? (
                <CheckCircleIcon class="size-6" />
              ) : (
                <ShieldIcon class="size-6" />
              )}
            </span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="m-0 text-xl font-extrabold tracking-tight text-slate-950">
                  {theme.label}
                </h2>
                <span class={`rounded-full px-2.5 py-1 text-xs font-extrabold ${theme.badge}`}>
                  {rules.length}
                </span>
              </div>
              <p class="mt-2 mb-0 text-sm leading-6 text-slate-600">
                {theme.description}
              </p>
            </div>
          </div>
        </div>

        <form class="mt-5" onSubmit={handleSubmit}>
          <label class="block text-xs font-extrabold text-slate-600" for={`${kind}-domain`}>
            {t('New Domain')}
          </label>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              aria-describedby={validationError ? `${kind}-domain-error` : undefined}
              aria-invalid={validationError ? true : undefined}
              autocomplete="off"
              class="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100"
              disabled={busy}
              id={`${kind}-domain`}
              onInput={(event: JSX.TargetedEvent<HTMLInputElement, InputEvent>) =>
                setInput(event.currentTarget.value)
              }
              placeholder={t('example.com')}
              spellcheck={false}
              type="text"
              value={input}
            />
            <button
              class={`inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 sm:w-auto rounded-xl border px-4 py-2.5 text-sm font-extrabold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${theme.button}`}
              disabled={busy || input.trim().length === 0}
              type="submit"
            >
              <PlusIcon class="size-4" />
              {action?.operation === 'add' && action.action === kind
                ? t('Adding...')
                : t('Added')}
            </button>
          </div>
          {validationError ? (
            <p class="mt-2 mb-0 text-xs font-semibold leading-5 text-red-700" id={`${kind}-domain-error`}>
              {validationError}
            </p>
          ) : null}
        </form>
      </div>

      <div class="p-4 sm:p-6">
        <label class="relative block" for={`${kind}-search`}>
          <span class="sr-only">{t('%s Search', theme.label)}</span>
          <SearchIcon class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
          <input
            class="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3.5 pl-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
            id={`${kind}-search`}
            onInput={(event: JSX.TargetedEvent<HTMLInputElement, InputEvent>) =>
              setSearch(event.currentTarget.value)
            }
            placeholder={t('%s Search', theme.label)}
            type="search"
            value={search}
          />
        </label>

        <div class="mt-4 max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200">
          {filteredRules.length > 0 ? (
            <ul class="m-0 list-none divide-y divide-slate-200 p-0">
              {filteredRules.map((domain) => {
                const deleting =
                  action?.operation === 'delete' &&
                  action.action === kind &&
                  action.domain === domain;

                return (
                  <li class="flex min-w-0 items-center justify-between gap-3 px-3.5 py-3" key={domain}>
                    <code class="min-w-0 break-all font-mono text-sm font-semibold text-slate-800">
                      {domain}
                    </code>
                    <button
                      aria-label={t('Remove from %s %s', domain, theme.label)}
                      class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void onDeleteRule(kind, domain)}
                      title={t('Deleted')}
                      type="button"
                    >
                      <TrashIcon class={`size-4 ${deleting ? 'animate-pulse' : ''}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div class="px-5 py-10 text-center">
              <ListIcon class="mx-auto size-8 text-slate-300" />
              <p class="mt-3 mb-0 text-sm font-bold text-slate-600">
                {search.trim().length > 0
                  ? t('No results found.')
                  : theme.empty}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function SafeShieldRulesPage({
  action,
  data,
  error,
  feedback,
  loading,
  onAddRule,
  onDeleteRule,
  onDismissFeedback,
  onRetry,
}: SafeShieldRulesPageProps) {
  if (loading && !data) {
    return <LoadingPanel />;
  }

  if (error && !data) {
    return <ErrorPanel message={error} onRetry={onRetry} />;
  }

  if (!data) {
    return <ErrorPanel message={t('User rule response is empty.')} onRetry={onRetry} />;
  }

  return (
    <>
      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex min-w-0 items-start gap-3 sm:gap-4">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
              <ListIcon class="size-7" />
            </span>
            <div class="min-w-0">
              <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
                {t('Local overrides')}
              </p>
              <h2 class="mt-2 mb-0 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                {t('User Domain Rules')}
              </h2>
              <p class="mt-2 mb-0 max-w-3xl text-sm leading-6 text-slate-600">
                {t('Unblock the false positives, and add the desired domains to the SafeShield protection list.')}
              </p>
            </div>
          </div>
          <dl class="m-0 grid grid-cols-3 gap-2 sm:min-w-80">
            <div class="rounded-xl bg-emerald-50 px-3 py-3 text-center">
              <dt class="text-[0.68rem] font-extrabold uppercase tracking-wide text-emerald-700">{t('Allow')}</dt>
              <dd class="mt-1 mb-0 ml-0 text-lg font-black text-emerald-950">{data.counts.allow}</dd>
            </div>
            <div class="rounded-xl bg-red-50 px-3 py-3 text-center">
              <dt class="text-[0.68rem] font-extrabold uppercase tracking-wide text-red-700">{t('Block')}</dt>
              <dd class="mt-1 mb-0 ml-0 text-lg font-black text-red-950">{data.counts.block}</dd>
            </div>
            <div class="rounded-xl bg-slate-100 px-3 py-3 text-center">
              <dt class="text-[0.68rem] font-extrabold uppercase tracking-wide text-slate-600">{t('ALL')}</dt>
              <dd class="mt-1 mb-0 ml-0 text-lg font-black text-slate-950">{data.counts.total}</dd>
            </div>
          </dl>
        </div>
      </section>

      {!data.applyLocalOverrides ? (
        <section class="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="alert">
          <AlertIcon class="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <p class="m-0 text-sm font-extrabold text-amber-950">{t('Local rule enforcement is off')}</p>
            <p class="mt-1 mb-0 text-sm leading-6 text-amber-800">
              {t('Rules will be saved, but will not be reflected in DNS until you turn on SafeShield\'s apply_local_overrides setting.')}
            </p>
          </div>
        </section>
      ) : null}

      {!data.safeshieldEnabled ? (
        <section class="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4" role="status">
          <ShieldIcon class="mt-0.5 size-5 shrink-0 text-slate-600" />
          <div>
            <p class="m-0 text-sm font-extrabold text-slate-950">{t('SafeShield is disabled')}</p>
            <p class="mt-1 mb-0 text-sm leading-6 text-slate-600">
              {t('You can save the rule upfront, and it will take effect when you turn on SafeShield and renew the blocklist.')}
            </p>
          </div>
        </section>
      ) : null}

      {feedback ? (
        <section aria-live="polite" class="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 sm:flex-row sm:justify-between p-4">
          <div class="flex min-w-0 items-start gap-3">
            <CheckCircleIcon class="mt-0.5 size-5 shrink-0 text-teal-700" />
            <p class="m-0 text-sm font-semibold leading-6 text-teal-950">{feedback}</p>
          </div>
          <button
            class="shrink-0 rounded-lg border-0 bg-transparent px-2 py-1 text-xs font-extrabold text-teal-800 hover:bg-teal-100"
            onClick={onDismissFeedback}
            type="button"
          >
            {t('CLOSE')}
          </button>
        </section>
      ) : null}

      {error && data ? (
        <section aria-live="assertive" class="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertIcon class="mt-0.5 size-5 shrink-0 text-red-700" />
          <p class="m-0 text-sm font-semibold leading-6 text-red-900">{error}</p>
        </section>
      ) : null}

      <section class="mt-5 grid gap-5 xl:grid-cols-2">
        <RuleListCard
          action={action}
          kind="allow"
          onAddRule={onAddRule}
          onDeleteRule={onDeleteRule}
          rules={data.allow}
        />
        <RuleListCard
          action={action}
          kind="block"
          onAddRule={onAddRule}
          onDeleteRule={onDeleteRule}
          rules={data.block}
        />
      </section>

      <p class="mt-5 mb-0 text-xs leading-5 text-slate-500">
        {t('Rule saving and validation are managed by the SafeShield API. Domains will be normalized to lowercase and duplicates will remain as one.')}
      </p>
    </>
  );
}
