import { useCallback, useState } from 'preact/hooks';

import {
  addSafeShieldRule,
  deleteSafeShieldRule,
  fetchSafeShieldRules,
} from '../api/smartsafehub';
import type {
  SafeShieldRuleAction,
  SafeShieldRuleMutationResult,
} from '../types/rules';
import { errorMessage } from '../utils/errors';
import { useAsyncResource } from './useAsyncResource';

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

function mutationMessage(result: SafeShieldRuleMutationResult): string {
  if (!result.changed) {
    return result.action === 'allow'
      ? '이미 허용 목록에 있는 도메인입니다.'
      : '이미 차단 목록에 있는 도메인입니다.';
  }

  const verb = result.action === 'allow' ? '허용' : '차단';

  switch (result.refresh.reason) {
    case 'started':
      return `${result.domain} ${verb} 규칙을 저장했고 SafeShield 적용을 시작했습니다.`;
    case 'already_running':
      return `${result.domain} ${verb} 규칙을 저장했습니다. 진행 중인 갱신이 이미 규칙을 읽었다면 다음 갱신에 반영됩니다.`;
    case 'safeshield_disabled':
      return `${result.domain} ${verb} 규칙을 저장했습니다. SafeShield를 켠 뒤 갱신하면 적용됩니다.`;
    case 'local_overrides_disabled':
      return `${result.domain} ${verb} 규칙을 저장했습니다. 로컬 규칙 적용 설정이 꺼져 있어 아직 적용되지 않습니다.`;
    case 'start_failed':
      return `${result.domain} ${verb} 규칙을 저장했지만 자동 갱신을 시작하지 못했습니다. SafeShield 화면에서 다시 갱신해 주세요.`;
    default:
      return `${result.domain} ${verb} 규칙을 저장했습니다.`;
  }
}

function deletionMessage(result: SafeShieldRuleMutationResult): string {
  if (!result.changed) {
    return '이미 삭제된 규칙입니다.';
  }

  const label = result.action === 'allow' ? '허용' : '차단';

  return result.refresh.started
    ? `${result.domain} ${label} 규칙을 삭제했고 SafeShield 적용을 시작했습니다.`
    : `${result.domain} ${label} 규칙을 삭제했습니다.`;
}

export function useSafeShieldRules(active: boolean) {
  const resource = useAsyncResource({
    active,
    fallbackError: '사용자 규칙을 불러오지 못했습니다.',
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
        const result =
          operation === 'add'
            ? await addSafeShieldRule(action, domain)
            : await deleteSafeShieldRule(action, domain);

        resource.replaceData(result.rules);
        setMutation({
          action: null,
          error: null,
          feedback:
            operation === 'add'
              ? mutationMessage(result)
              : deletionMessage(result),
        });
        return true;
      } catch (error) {
        setMutation({
          action: null,
          error: errorMessage(error, '사용자 규칙을 변경하지 못했습니다.'),
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
