import { SoftwareUpdatesCard } from '../components/SoftwareUpdatesCard';
import type { SoftwareUpdateAction } from '../hooks/useSoftwareUpdates';
import type {
  SoftwareUpdateSettingsInput,
  SoftwareUpdateStatus,
} from '../types/updates';

interface UpdatePageProps {
  action: SoftwareUpdateAction;
  actionError: string | null;
  data: SoftwareUpdateStatus | null;
  error: string | null;
  loading: boolean;
  message: string | null;
  onCheck: () => void;
  onDismissFeedback: () => void;
  onInstall: () => void;
  onRetry: () => void;
  onSaveSettings: (input: SoftwareUpdateSettingsInput) => Promise<boolean>;
}

export function UpdatePage({
  action,
  actionError,
  data,
  error,
  loading,
  message,
  onCheck,
  onDismissFeedback,
  onInstall,
  onRetry,
  onSaveSettings,
}: UpdatePageProps) {
  return (
    <section class="min-w-0">
      <SoftwareUpdatesCard
        action={action}
        actionError={actionError}
        data={data}
        error={error}
        loading={loading}
        message={message}
        onCheck={onCheck}
        onDismissFeedback={onDismissFeedback}
        onInstall={onInstall}
        onRetry={onRetry}
        onSaveSettings={onSaveSettings}
      />
    </section>
  );
}
