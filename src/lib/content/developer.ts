import { Platform } from 'react-native';

/** A release cannot opt in through a URL, stored setting or environment flag. */
export function isContentDeveloper(): boolean {
  return __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' &&
    window.location.hostname === 'localhost' && window.location.port === '8081';
}
