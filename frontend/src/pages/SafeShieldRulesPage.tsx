import type { TargetedEvent, TargetedSubmitEvent } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { RelativeTimestamp } from '../components/RelativeTimestamp';

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
import type { RecommendedRulesStatus, SafeShieldRuleAction, SafeShieldRules } from '../types/rules';

interface SafeShieldRulesPageProps {
  action: SafeShieldRulesAction | null;
  data: SafeShieldRules | null;
  error: string | null;
  feedback: string | null;
  loading: boolean;
  onAddRule: (
    action: SafeShieldRuleAction,
    domain: string,
    onPersisted?: () => void,
  ) => Promise<boolean>;
  onDeleteRule: (
    action: SafeShieldRuleAction,
    domain: string,
  ) => Promise<boolean>;
  onDismissFeedback: () => void;
  onRetry: () => void;
  // Injected only by the authenticated router app; the public demo has no RPC.
  onLoadRecommendedRulesStatus?: () => Promise<RecommendedRulesStatus>;
  onSyncRecommendedRules?: () => Promise<RecommendedRulesStatus>;
}

interface RuleListCardProps {
  action: SafeShieldRulesAction | null;
  kind: SafeShieldRuleAction;
  onAddRule: (
    action: SafeShieldRuleAction,
    domain: string,
    onPersisted?: () => void,
  ) => Promise<boolean>;
  onDeleteRule: (
    action: SafeShieldRuleAction,
    domain: string,
  ) => Promise<boolean>;
  rules: string[];
  recommendedDomains: string[];
  recommendedKnown: boolean;
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
  recommendedDomains,
  recommendedKnown,
}: RuleListCardProps) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [manualExpanded, setManualExpanded] = useState(true);
  // Small groups start expanded; larger lists start collapsed. Once the user
  // changes it, keep their choice even when the next sync updates the list.
  const [recommendedExpanded, setRecommendedExpanded] = useState<boolean | null>(null);
  const isAllow = kind === 'allow';
  const busy = action !== null;
  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? rules.filter((domain) => domain.includes(query)) : rules;
  }, [rules, search]);
  const searching = search.trim().length > 0;
  // The router only knows which allow entries the reconciler owns. It does
  // not receive the Hub rule titles, so do not invent per-service group names.
  const managedRules = isAllow && recommendedKnown
    ? filteredRules.filter((domain) => recommendedDomains.includes(domain))
    : [];
  const manualRules = isAllow && recommendedKnown
    ? filteredRules.filter((domain) => !recommendedDomains.includes(domain))
    : filteredRules;
  const showRecommended = searching || (recommendedExpanded ?? managedRules.length <= 3);
  const showManual = searching || manualExpanded;

  async function handleSubmit(event: TargetedSubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const domain = normalizeDomain(input);
    if (!isValidDomain(domain)) {
      setValidationError('example.com 형식의 도메인을 입력해 주세요. URL, IP 주소, 와일드카드는 사용할 수 없습니다.');
      return;
    }
    setValidationError(null);
    await onAddRule(kind, domain, () => {
      // Clear when persisted, not after the slower DNS refresh finishes.
      setInput((current) => normalizeDomain(current) === domain ? '' : current);
    });
  }

  const theme = isAllow
    ? {
        badge: 'bg-emerald-100 text-emerald-800',
        button: 'border-emerald-700 bg-emerald-700 text-white hover:border-emerald-800 hover:bg-emerald-800 focus-visible:ring-emerald-100',
        icon: 'bg-emerald-50 text-emerald-700',
        label: '허용 목록',
        description: '직접 허용하거나 웹사이트 추천으로 추가된 도메인을 관리합니다.',
        empty: '등록된 허용 도메인이 없습니다.',
      }
    : {
        badge: 'bg-red-100 text-red-800',
        button: 'border-red-700 bg-red-700 text-white hover:border-red-800 hover:bg-red-800 focus-visible:ring-red-100',
        icon: 'bg-red-50 text-red-700',
        label: '차단 목록',
        description: 'SafeShield 기본 목록에 없더라도 직접 차단할 도메인을 등록합니다.',
        empty: '등록된 차단 도메인이 없습니다.',
      };

  function renderRule(domain: string) {
    // A manual entry that happens to match a cloud recommendation must
    // remain deletable. Only entries actually owned by the reconciler lock.
    const cloudManaged = isAllow && recommendedKnown && recommendedDomains.includes(domain);
    const ruleOrigin = !isAllow || recommendedKnown
      ? (cloudManaged ? '추천 규칙' : '직접 추가')
      : null;
    const deleting = action?.operation === 'delete' && action.action === kind && action.domain === domain;
    return (
      <li class="flex min-w-0 items-center justify-between gap-3 px-3.5 py-3" key={domain}>
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <code class="min-w-0 break-all font-mono text-sm font-semibold text-slate-800">{domain}</code>
        </div>
        {cloudManaged ? (
          <span class="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800" title="추천 규칙의 적용과 해제는 웹사이트에서 관리합니다.">
            웹사이트 관리
          </span>
        ) : (
          <button
            aria-label={`${domain} ${theme.label}에서 삭제`}
            class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || cloudManaged}
            onClick={() => void onDeleteRule(kind, domain)}
            title={ruleOrigin === '직접 추가' ? '직접 추가한 규칙 삭제' : '삭제'}
            type="button"
          >
            <TrashIcon class={`size-4 ${deleting ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </li>
    );
  }

  return (
    <article class="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <div class="border-b border-slate-200 p-4 sm:p-6">
        <div class="flex min-w-0 items-start gap-3">
          <span class={`grid size-11 shrink-0 place-items-center rounded-xl ${theme.icon}`}>
            {isAllow ? <CheckCircleIcon class="size-6" /> : <ShieldIcon class="size-6" />}
          </span>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="m-0 text-xl font-extrabold tracking-tight text-slate-950">{theme.label}</h2>
              <span class={`rounded-full px-2.5 py-1 text-xs font-extrabold ${theme.badge}`}>{rules.length}</span>
            </div>
            <p class="mt-2 mb-0 text-sm leading-6 text-slate-600">{theme.description}</p>
          </div>
        </div>
        <form class="mt-5" onSubmit={handleSubmit}>
          <label class="block text-xs font-extrabold text-slate-600" for={`${kind}-domain`}>새 도메인</label>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              aria-describedby={validationError ? `${kind}-domain-error` : undefined}
              aria-invalid={validationError ? true : undefined}
              autocomplete="off"
              class="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={busy}
              id={`${kind}-domain`}
              onInput={(event: TargetedEvent<HTMLInputElement, InputEvent>) => setInput(event.currentTarget.value)}
              placeholder="example.com"
              spellcheck={false}
              type="text"
              value={input}
            />
            <button
              class={`inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-extrabold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${theme.button}`}
              disabled={busy || input.trim().length === 0}
              type="submit"
            >
              <PlusIcon class="size-4" />
              {action?.operation === 'add' && action.action === kind ? '추가 중…' : '추가'}
            </button>
          </div>
          {validationError ? <p class="mt-2 mb-0 text-xs font-semibold leading-5 text-red-700" id={`${kind}-domain-error`}>{validationError}</p> : null}
        </form>
      </div>

      <div class="p-4 sm:p-6">
        <label class="relative block" for={`${kind}-search`}>
          <span class="sr-only">{theme.label} 검색</span>
          <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400"><SearchIcon class="size-4" /></span>
          <input
            class="min-h-11 w-full rounded-xl border-2 border-slate-300 bg-slate-50 py-2.5 pr-4 pl-11 text-sm font-semibold text-slate-950 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            id={`${kind}-search`}
            onInput={(event: TargetedEvent<HTMLInputElement, InputEvent>) => setSearch(event.currentTarget.value)}
            placeholder={`${theme.label} 검색`}
            type="search"
            value={search}
          />
        </label>

        {isAllow && recommendedKnown ? (
          <div class="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <section aria-label="직접 추가한 허용 규칙">
              <button
                aria-controls="allow-manual-domains"
                aria-expanded={showManual}
                class="flex min-h-14 w-full items-center justify-between gap-3 ssh-rule-group-toggle bg-slate-50 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-teal-500"
                onClick={() => setManualExpanded(!showManual)}
                type="button"
              >
                <span class="min-w-0 text-sm font-extrabold text-slate-800">직접 추가한 규칙 <span class="ml-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600">{manualRules.length}{searching ? '개 검색됨' : '개'}</span></span>
                <span aria-hidden="true" class="shrink-0 text-sm font-bold text-slate-500">{showManual ? '접기 −' : '펼치기 +'}</span>
              </button>
              <div hidden={!showManual} id="allow-manual-domains">
                {manualRules.length ? (
                  <ul class="m-0 max-h-[20rem] list-none divide-y divide-slate-200 overflow-y-auto p-0">{manualRules.map(renderRule)}</ul>
                ) : (
                  <p class="m-0 px-4 py-5 text-sm text-slate-500">{searching ? '검색 결과가 없습니다.' : '직접 추가한 허용 도메인이 없습니다.'}</p>
                )}
              </div>
            </section>
            <section aria-label="웹사이트 추천 규칙" class="border-t border-slate-200">
              <button
                aria-controls="allow-recommended-domains"
                aria-expanded={showRecommended}
                class="flex min-h-14 w-full items-center justify-between gap-3 ssh-rule-group-toggle bg-slate-50 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-teal-500"
                onClick={() => setRecommendedExpanded(!showRecommended)}
                type="button"
              >
                <span class="min-w-0 text-sm font-extrabold text-slate-800">추천 규칙 <span class="ml-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-teal-800">{managedRules.length}{searching ? '개 검색됨' : '개'}</span></span>
                <span aria-hidden="true" class="shrink-0 text-sm font-bold text-slate-500">{showRecommended ? '접기 −' : '펼치기 +'}</span>
              </button>
              <div hidden={!showRecommended} id="allow-recommended-domains">
                {managedRules.length ? (
                  <ul class="m-0 max-h-[20rem] list-none divide-y divide-slate-200 overflow-y-auto p-0">{managedRules.map(renderRule)}</ul>
                ) : (
                  <p class="m-0 px-4 py-5 text-sm text-slate-500">{searching ? '검색 결과가 없습니다.' : '추천으로 추가된 허용 도메인이 없습니다.'}</p>
                )}
                {!searching ? (
                  <p class="m-0 border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500">추천 규칙은 웹사이트에서 적용하거나 해제할 수 있습니다. 서비스별 상세 정보도 웹사이트에서 확인해 주세요.</p>
                ) : null}
              </div>
            </section>
          </div>
        ) : (
          <div class="mt-4 max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200">
            {filteredRules.length ? (
              <ul class="m-0 list-none divide-y divide-slate-200 p-0">{filteredRules.map(renderRule)}</ul>
            ) : (
              <div class="px-5 py-10 text-center">
                <ListIcon class="mx-auto size-8 text-slate-300" />
                <p class="mt-3 mb-0 text-sm font-bold text-slate-600">{searching ? '검색 결과가 없습니다.' : theme.empty}</p>
              </div>
            )}
          </div>
        )}
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
  onLoadRecommendedRulesStatus,
  onSyncRecommendedRules,
}: SafeShieldRulesPageProps) {
  const [recommendedStatus, setRecommendedStatus] = useState<RecommendedRulesStatus | null>(null);
  const [recommendedKnown, setRecommendedKnown] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const recommendedDomains = recommendedStatus?.domains ?? [];

  useEffect(() => {
    if (!onLoadRecommendedRulesStatus) return;
    let mounted = true;
    void onLoadRecommendedRulesStatus()
      .then((status) => {
        if (mounted) {
          setRecommendedStatus(status);
          setRecommendedKnown(true);
        }
      })
      .catch(() => {
        // Older firmware/API errors must not hide or break manual rules.
        if (mounted) setRecommendedKnown(false);
      });
    return () => { mounted = false; };
  }, [data?.allow.join('\n'), onLoadRecommendedRulesStatus]);

  async function handleSyncRecommended(): Promise<void> {
    if (!onSyncRecommendedRules || syncing) return;
    setSyncing(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const status = await onSyncRecommendedRules();
      setRecommendedStatus(status);
      setRecommendedKnown(true);
      setSyncMessage(status.syncStatus === 'confirmed'
        ? '서버에서 규칙을 가져와 SafeShield 허용 목록을 확인했습니다.'
        : status.syncStatus === 'failed'
          ? '기기 연결은 확인했지만 추천 규칙 반영에 실패했습니다. 다음 자동 동기화에서 다시 시도합니다.'
          : '동기화를 요청했습니다. 아직 확인된 추천 규칙이 없습니다.');
      onRetry(); // Reload the actual SafeShield allow list after reconciliation.
    } catch {
      setSyncError('추천 규칙을 동기화하지 못했습니다. 서버 연결 및 기기 등록 상태를 확인해 주세요.');
    } finally {
      setSyncing(false);
    }
  }

  if (loading && !data) {
    return <LoadingPanel />;
  }

  if (error && !data) {
    return <ErrorPanel message={error} onRetry={onRetry} />;
  }

  if (!data) {
    return <ErrorPanel message="사용자 규칙 응답이 비어 있습니다." onRetry={onRetry} />;
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
                Local overrides
              </p>
              <h2 class="mt-2 mb-0 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                사용자 도메인 규칙
              </h2>
              <p class="mt-2 mb-0 max-w-3xl text-sm leading-6 text-slate-600">
                허용 목록은 오탐을 해제하고, 차단 목록은 원하는 도메인을 SafeShield 보호 목록에 추가합니다.
              </p>
            </div>
          </div>
          <dl class="m-0 grid grid-cols-3 gap-2 sm:min-w-80">
            <div class="rounded-xl bg-emerald-50 px-3 py-3 text-center">
              <dt class="text-[0.68rem] font-extrabold uppercase tracking-wide text-emerald-700">허용</dt>
              <dd class="mt-1 mb-0 ml-0 text-lg font-black text-emerald-950">{data.counts.allow}</dd>
            </div>
            <div class="rounded-xl bg-red-50 px-3 py-3 text-center">
              <dt class="text-[0.68rem] font-extrabold uppercase tracking-wide text-red-700">차단</dt>
              <dd class="mt-1 mb-0 ml-0 text-lg font-black text-red-950">{data.counts.block}</dd>
            </div>
            <div class="rounded-xl bg-slate-100 px-3 py-3 text-center">
              <dt class="text-[0.68rem] font-extrabold uppercase tracking-wide text-slate-600">전체</dt>
              <dd class="mt-1 mb-0 ml-0 text-lg font-black text-slate-950">{data.counts.total}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5" aria-label="추천 사용자 규칙">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="grid size-8 place-items-center rounded-lg bg-teal-50 text-teal-700"><CheckCircleIcon class="size-4" /></span>
              <h2 class="m-0 text-base font-extrabold text-slate-950">추천 사용자 규칙</h2>
              {onLoadRecommendedRulesStatus ? (
                <span aria-live="polite" class={`rounded-full px-2.5 py-1 text-xs font-bold ${recommendedStatus?.syncStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : recommendedStatus?.syncStatus === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                  {recommendedStatus?.syncStatus === 'confirmed' ? '허용 목록 확인' : recommendedStatus?.syncStatus === 'failed' ? '동기화 실패' : '동기화 대기'}
                </span>
              ) : null}
            </div>
            <p class="mt-2 mb-0 text-sm leading-6 text-slate-600">웹사이트에서 선택한 허용 규칙을 약 30초마다 확인합니다. 적용과 해제는 웹사이트에서 관리하세요.</p>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
              <span>추천으로 추가 <strong class="text-teal-800">{recommendedKnown ? recommendedDomains.length : '—'}개 도메인</strong></span>
              {recommendedStatus?.syncStatus === 'confirmed' ? (
                <span>허용 확인 <strong class="text-emerald-800">{recommendedStatus.confirmedDomains.length}개</strong></span>
              ) : null}
              {recommendedStatus?.lastCheckedAt ? (
                <span>최근 확인: <RelativeTimestamp timestamp={recommendedStatus.lastCheckedAt} /></span>
              ) : null}
            </div>
          </div>
          <div class="flex w-full flex-wrap gap-2 sm:w-auto lg:shrink-0">
            {onSyncRecommendedRules ? (
              <button
                class="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:flex-none"
                disabled={syncing}
                onClick={() => void handleSyncRecommended()}
                type="button"
              >{syncing ? '동기화 중…' : '지금 동기화'}</button>
            ) : null}
            <a class="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-teal-700 bg-teal-700 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-teal-800 sm:flex-none" href="https://www.smartsafehub.com/dashboard/recommended-rules/" target="_blank" rel="noopener noreferrer">추천 규칙 보기 ↗</a>
          </div>
        </div>
        {syncMessage ? <p class="mt-3 mb-0 text-sm font-semibold text-teal-800" role="status">{syncMessage}</p> : null}
        {syncError ? <p class="mt-3 mb-0 text-sm font-semibold text-red-700" role="alert">{syncError}</p> : null}
        <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">추천 규칙 동기화는 SafeShield 차단 목록 갱신과 별개입니다. 허용 목록 확인은 DNS 처리나 서비스 재생 성공을 보장하지 않습니다.</p>
      </section>

      {!data.applyLocalOverrides ? (
        <section class="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="alert">
          <AlertIcon class="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <p class="m-0 text-sm font-extrabold text-amber-950">로컬 규칙 적용이 꺼져 있습니다</p>
            <p class="mt-1 mb-0 text-sm leading-6 text-amber-800">
              규칙은 저장되지만 SafeShield의 apply_local_overrides 설정을 켜기 전까지 DNS에 반영되지 않습니다.
            </p>
          </div>
        </section>
      ) : null}

      {!data.safeshieldEnabled ? (
        <section class="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4" role="status">
          <ShieldIcon class="mt-0.5 size-5 shrink-0 text-slate-600" />
          <div>
            <p class="m-0 text-sm font-extrabold text-slate-950">SafeShield가 비활성화되어 있습니다</p>
            <p class="mt-1 mb-0 text-sm leading-6 text-slate-600">
              규칙을 미리 저장할 수 있으며, SafeShield를 켜고 차단 목록을 갱신하면 적용됩니다.
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
            닫기
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
          recommendedDomains={recommendedDomains}
          recommendedKnown={recommendedKnown}
        />
        <RuleListCard
          action={action}
          kind="block"
          onAddRule={onAddRule}
          onDeleteRule={onDeleteRule}
          rules={data.block}
          recommendedDomains={recommendedDomains}
          recommendedKnown={recommendedKnown}
        />
      </section>

      <p class="mt-5 mb-0 text-xs leading-5 text-slate-500">
        규칙 저장과 유효성 검사는 SafeShield API가 관리합니다. 도메인은 소문자로 정규화되고 중복 항목은 하나로 유지됩니다.
      </p>
    </>
  );
}
