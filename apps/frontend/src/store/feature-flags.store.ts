import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { FeatureFlags, FeatureFlagKey } from '../lib/feature-flags';
import { getFeatureFlags } from '../lib/feature-flags';

interface FeatureFlagState {
  flags: FeatureFlags;
  isEnabled: (key: FeatureFlagKey) => boolean;
}

export const useFeatureFlags = create<FeatureFlagState>()(
  devtools(
    (set, get) => ({
      flags: getFeatureFlags(),
      isEnabled: (key) => Boolean(get().flags[key]),
    }),
    { name: 'FeatureFlags' },
  ),
);
