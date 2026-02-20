export type FeatureFlagKey =
  | 'notifications'
  | 'resourceComments'
  | 'approvals'
  | 'fileVersions'
  | 'twoFactorAuth';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const FEATURE_FLAG_ENV: Record<FeatureFlagKey, string> = {
  notifications: 'FEATURE_NOTIFICATIONS',
  resourceComments: 'FEATURE_RESOURCE_COMMENTS',
  approvals: 'FEATURE_APPROVALS',
  fileVersions: 'FEATURE_FILE_VERSIONS',
  twoFactorAuth: 'FEATURE_2FA',
};

function parseBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

export function getFeatureFlags(): FeatureFlags {
  return {
    notifications: parseBoolean(process.env[FEATURE_FLAG_ENV.notifications]),
    resourceComments: parseBoolean(process.env[FEATURE_FLAG_ENV.resourceComments]),
    approvals: parseBoolean(process.env[FEATURE_FLAG_ENV.approvals]),
    fileVersions: parseBoolean(process.env[FEATURE_FLAG_ENV.fileVersions]),
    twoFactorAuth: parseBoolean(process.env[FEATURE_FLAG_ENV.twoFactorAuth]),
  };
}

export const FEATURE_FLAGS: FeatureFlags = getFeatureFlags();

export function isFeatureEnabled(flag: FeatureFlagKey, fallback = false) {
  const envKey = FEATURE_FLAG_ENV[flag];
  return parseBoolean(process.env[envKey], fallback);
}
