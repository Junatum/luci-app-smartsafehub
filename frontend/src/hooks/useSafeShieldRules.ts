import { t } from '../utils/gettext';
import { useCallback, useState } from 'preact/hooks';

import {
  addSafeShieldRule,
  deleteSafeShieldRule,
  fetchSafeShieldRules,
  fetchSafeShieldStatus,
} from '../api/safeshield';
import type {
  SafeShieldRuleAction,
  SafeShieldRuleMutationResult,
} from '../types/rules';
import type { SafeShieldStatus } from '../types/safeshield';
import { errorMessage } from '../utils/errors';
import { useAsyncResource } from './useAsyncResource';

const LOCAL_APPLY_POLL_INTERVAL_MS = 500;
const LOCAL_APPLY_TIMEOUT_MS = 45_000;

export interface SafeShieldRulesAction {
  operation: 'add' | 'delete';
  action: SafeShieldRuleAction;
  domain: string;
}

interface SafeShieldRulesMutationState {
  action: SafeShieldRulesAction | null;
  error: string | null;
  feedback: string | null;
}

type LocalApplyOutcome =
  | { kind: 'success'; status: SafeShieldStatus }
  | { kind: 'failure'; status: SafeShieldStatus }
  | { kind: 'disabled'; status: SafeShieldStatus }
  | { kind: 'timeout'; status: SafeShieldStatus | null };

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function ruleLabel(action: SafeShieldRuleAction): string {
  return action === 'allow' ? t('Allow') : t('Block');
}

function savedOnlyMessage(
  operation: 'add' | 'delete',
  result: SafeShieldRuleMutationResult,
): string {
  if (!result.changed) {
    return operation === 'add'
      ? result.action === 'allow'
        ? t('This domain is already whitelisted.')
        : t('This domain is already on the blocklist.')
      : t('Rule has already been deleted.');
  }

  const label = ruleLabel(result.action);
  const verb = operation === 'add' ? t('Save') : t('Deleted');

  if (!result.rules.safeshieldEnabled) {
    return t('%s %s rule: %s completed. It will take effect after SafeShield is enabled and refreshed.', result.domain, label, verb);
  }

  if (!result.rules.applyLocalOverrides) {
    return t('%s %s rule: %s completed. Local rule application is disabled, so DNS has not been updated yet.', result.domain, label, verb);
  }

  return t('%s %s rule: %s completed.', result.domain, label, verb);
}

function applyingMessage(
  operation: 'add' | 'delete',
  result: SafeShieldRuleMutationResult,
): string {
  const verb = operation === 'add' ? t('Added') : t('Deleted');
  return t('Saved the %s %s rule %s. Applying local rules to DNS…', result.domain, ruleLabel(result.action), verb);
}

function appliedMessage(
  operation: 'add' | 'delete',
  result: SafeShieldRuleMutationResult,
): string {
  const verb = operation === 'add' ? t('Added') : t('Deleted');
  return t('Successfully applied %s %s rules %s and DNS.', result.domain, ruleLabel(result.action), verb);
}

async function waitForLocalApply(
  baseline: SafeShieldStatus,
): Promise<LocalApplyOutcome> {
  const deadline = Date.now() + LOCAL_APPLY_TIMEOUT_MS;
  let latest: SafeShieldStatus | null = null;

  while (Date.now() < deadline) {
    latest = await fetchSafeShieldStatus();

    if (!latest.enabled) {
      return { kind: 'disabled', status: latest };
    }

    if (
      latest.timestamps.lastLocalApply >
      baseline.timestamps.lastLocalApply
    ) {
      return { kind: 'success', status: latest };
    }

    if (
      latest.timestamps.lastLocalApplyFailure >
      baseline.timestamps.lastLocalApplyFailure
    ) {
      return { kind: 'failure', status: latest };
    }

    await sleep(LOCAL_APPLY_POLL_INTERVAL_MS);
  }

  return { kind: 'timeout', status: latest };
}

export function useSafeShieldRules(active: boolean) {
  const resource = useAsyncResource({
    active,
    fallbackError: t('Failed to load user rules.'),
    loader: fetchSafeShieldRules,
  });
  const [mutation, setMutation] = useState<SafeShieldRulesMutationState>({
    action: null,
    error: null,
    feedback: null,
  });

  const mutate = useCallback(
    async (
      operation: 'add' | 'delete',
      action: SafeShieldRuleAction,
      domain: string,
    ): Promise<boolean> => {
      setMutation({
        action: { operation, action, domain },
        error: null,
        feedback: null,
      });

      try {
        // Capture the engine's local-apply generation before persisting the
        // mutation. SafeShield owns serialization, debounce, merge and dnsmasq
        // verification; the UI only waits for the authoritative apply stamp.
        const baseline = await fetchSafeShieldStatus();
        const result =
          operation === 'add'
            ? await addSafeShieldRule(action, domain, true)
            : await deleteSafeShieldRule(action, domain, true);

        resource.replaceData(result.rules);

        const shouldApply =
          result.changed &&
          result.rules.safeshieldEnabled &&
          result.rules.applyLocalOverrides;

        if (!shouldApply) {
          setMutation({
            action: null,
            error: null,
            feedback: savedOnlyMessage(operation, result),
          });
          return true;
        }

        if (!result.refresh.accepted) {
          setMutation({
            action: null,
            error: t('The rule was saved but failed to initiate a local DNS enforcement request %s.', result.refresh.reason ? ` (${result.refresh.reason})` : ''),
            feedback: null,
          });
          return true;
        }

        setMutation({
          action: null,
          error: null,
          feedback: applyingMessage(operation, result),
        });

        const outcome = await waitForLocalApply(baseline);

        if (outcome.kind === 'success') {
          setMutation({
            action: null,
            error: null,
            feedback: appliedMessage(operation, result),
          });
          return true;
        }

        if (outcome.kind === 'disabled') {
          setMutation({
            action: null,
            error: null,
            feedback: t('The rule has been saved, but SafeShield has been turned off and is awaiting DNS enforcement.'),
          });
          return true;
        }

        if (outcome.kind === 'failure') {
          setMutation({
            action: null,
            error: t('The rule was saved, but local DNS enforcement failed. Please check your SafeShield status.'),
            feedback: null,
          });
          return true;
        }

        setMutation({
          action: null,
          error: t('The rule was saved, but we couldn\'t confirm the completion of applying local DNS within the time limit.'),
          feedback: null,
        });
        return true;
      } catch (error) {
        setMutation({
          action: null,
          error: errorMessage(error, t('Failed to change user rules.')),
          feedback: null,
        });
        return false;
      }
    },
    [resource.replaceData],
  );

  const addRule = useCallback(
    (action: SafeShieldRuleAction, domain: string) =>
      mutate('add', action, domain),
    [mutate],
  );

  const deleteRule = useCallback(
    (action: SafeShieldRuleAction, domain: string) =>
      mutate('delete', action, domain),
    [mutate],
  );

  const refresh = useCallback(async () => {
    setMutation((current) => ({ ...current, error: null }));
    await resource.refresh();
  }, [resource.refresh]);

  const dismissFeedback = useCallback(() => {
    setMutation((current) => ({ ...current, feedback: null }));
  }, []);

  return {
    ...resource,
    ...mutation,
    error: mutation.error ?? resource.error,
    addRule,
    deleteRule,
    dismissFeedback,
    refresh,
  };
}
