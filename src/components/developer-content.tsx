import { isContentDeveloper } from '@/lib/content/developer';

// Keep require INSIDE the compile-time branch. A static import would leave
// provider clients and key UI in the production module graph.
export function DeveloperContent() {
  if (__DEV__ && isContentDeveloper()) {
    const Studio = require('../dev/content-studio').default;
    return <Studio />;
  }
  return null;
}
