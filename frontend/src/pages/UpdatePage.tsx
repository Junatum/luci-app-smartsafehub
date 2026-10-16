import { FirmwareUpdatesCard } from '../components/FirmwareUpdatesCard';
import { SoftwareUpdatesCard } from '../components/SoftwareUpdatesCard';
import type { FirmwareAction } from '../hooks/useFirmwareUpdates';
import type { FirmwareStatus } from '../types/firmware';
import type { SoftwareUpdateAction } from '../hooks/useSoftwareUpdates';
import type {
  SoftwareUpdateSettingsInput,
  SoftwareUpdateStatus,
} from '../types/updates';

// Structural contract shared by the real hook and the fixture-only public demo.
// No hook is executed inside this page.
interface FirmwareController {
  action: FirmwareAction;
  actionError: string | null;
  data: FirmwareStatus | null;
  error: string | null;
  loading: boolean;
  message: string | null;
  reconnecting: boolean;
  uploadProgress: number | null;
  check: () => void | Promise<void>;
  discard: () => Promise<boolean>;
  dismissFeedback: () => void;
  install: (keepSettings: boolean) => Promise<boolean>;
  prepare: () => void | Promise<void>;
  refresh: () => void | Promise<void>;
  upload: (file: File) => Promise<boolean>;
}

interface UpdatePageProps {
  action: SoftwareUpdateAction;
  actionError: string | null;
  data: SoftwareUpdateStatus | null;
  error: string | null;
  firmware: FirmwareController;
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
  firmware,
  loading,
  message,
  onCheck,
  onDismissFeedback,
  onInstall,
  onRetry,
  onSaveSettings,
}: UpdatePageProps) {
  return (
    <section class="min-w-0 space-y-5">
      <FirmwareUpdatesCard
        action={firmware.action}
        actionError={firmware.actionError}
        data={firmware.data}
        software={data}
        error={firmware.error}
        loading={firmware.loading}
        message={firmware.message}
        reconnecting={firmware.reconnecting}
        uploadProgress={firmware.uploadProgress}
        onCheck={() => void firmware.check()}
        onDiscard={firmware.discard}
        onDismissFeedback={firmware.dismissFeedback}
        onInstall={firmware.install}
        onPrepare={() => void firmware.prepare()}
        onRetry={() => void firmware.refresh()}
        onUpload={firmware.upload}
      />
      <SoftwareUpdatesCard
        firmware={firmware.data}
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
