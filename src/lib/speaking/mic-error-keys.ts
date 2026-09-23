import type { TranslationKey } from '../i18n';
import type { MicrophoneCaptureErrorCode } from './microphone-capture';

/**
 * Mikrofon-Fehlercode → i18n-Key. Die `message` der Aufnahme-Hooks bleibt
 * deutscher Diagnosetext; angezeigt wird immer die übersetzte Fassung.
 */
export const MIC_ERROR_KEYS: Record<MicrophoneCaptureErrorCode, TranslationKey> = {
  unsupported: 'micError.unsupported',
  'permission-denied': 'micError.permissionDenied',
  'start-failed': 'micError.startFailed',
  'capture-failed': 'micError.captureFailed',
  empty: 'micError.empty',
};
