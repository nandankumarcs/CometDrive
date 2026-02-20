export type FeatureFlagKey =
  | 'notifications'
  | 'resourceComments'
  | 'approvals'
  | 'fileVersions'
  | 'twoFactorAuth';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const DEFAULT_FLAGS: FeatureFlags = {
  notifications: false,
  resourceComments: false,
  approvals: false,
  fileVersions: false,
  twoFactorAuth: false,
};

const FLAG_ENV: Record<FeatureFlagKey, string> = {
  notifications: 'NEXT_PUBLIC_FEATURE_NOTIFICATIONS',
  resourceComments: 'NEXT_PUBLIC_FEATURE_RESOURCE_COMMENTS',
  approvals: 'NEXT_PUBLIC_FEATURE_APPROVALS',
  fileVersions: 'NEXT_PUBLIC_FEATURE_FILE_VERSIONS',
  twoFactorAuth: 'NEXT_PUBLIC_FEATURE_2FA',
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

export function getFeatureFlags(): FeatureFlags {
  return (Object.keys(DEFAULT_FLAGS) as FeatureFlagKey[]).reduce((acc, key) => {
    const envKey = FLAG_ENV[key];
    acc[key] = parseBoolean(process.env[envKey], DEFAULT_FLAGS[key]);
    return acc;
  }, {} as FeatureFlags);
}

export const FEATURE_FLAGS = getFeatureFlags();

export function isFeatureEnabled(key: FeatureFlagKey, fallback = false) {
  const envKey = FLAG_ENV[key];
  return parseBoolean(process.env[envKey], fallback);
}
