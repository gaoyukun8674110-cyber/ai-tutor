import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { resetApiClientState } from './src/utils/apiClient';

afterEach(() => {
  cleanup();
  // apiClient holds module-level auth state (access token + in-flight refresh
  // promise) that is shared across every test in a worker. Reset it after each
  // case so a leaked token or a foreign in-flight refresh from one test can
  // never bleed into the next and race its fetch mocks.
  resetApiClientState();
});
