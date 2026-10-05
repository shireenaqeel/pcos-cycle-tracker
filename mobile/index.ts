import { registerRootComponent } from 'expo';
import { createElement } from 'react';

import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Wrapped at the root so a failure inside App — theming, fonts, the database —
// reports what broke instead of showing a bare red box.
function Root() {
  return createElement(ErrorBoundary, null, createElement(App));
}

registerRootComponent(Root);
