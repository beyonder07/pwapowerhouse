import { getOptionalEnv } from '@/lib/env';
import { DEFAULT_GYM_BRANCHES, formatDistanceLabel, getDistanceInMeters, type GymBranchConfig } from '@/lib/location';

function parseNumber(value: string, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getBranchOverride(index: number, branch: GymBranchConfig): GymBranchConfig {
  const suffix = `BRANCH_${index + 1}`;
  return {
    ...branch,
    label: getOptionalEnv(`NEXT_PUBLIC_GYM_${suffix}_LABEL`) || branch.label,
    latitude: parseNumber(getOptionalEnv(`NEXT_PUBLIC_GYM_${suffix}_LATITUDE`), branch.latitude),
    longitude: parseNumber(getOptionalEnv(`NEXT_PUBLIC_GYM_${suffix}_LONGITUDE`), branch.longitude),
    radiusMeters: Math.max(50, parseNumber(getOptionalEnv(`NEXT_PUBLIC_GYM_${suffix}_RADIUS_METERS`), branch.radiusMeters)),
    mapsUrl: getOptionalEnv(`NEXT_PUBLIC_GYM_${suffix}_MAPS_URL`) || branch.mapsUrl
  };
}

export function getGymBranchesConfig(): GymBranchConfig[] {
  return DEFAULT_GYM_BRANCHES.map((branch, index) => getBranchOverride(index, branch));
}

export type GymLocationValidationInput = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
};

export function validateGymProximity(input: GymLocationValidationInput) {
  const branches = getGymBranchesConfig().map((branch) => {
    const distanceMeters = getDistanceInMeters(
      input.latitude,
      input.longitude,
      branch.latitude,
      branch.longitude
    );
    const accuracyMeters = Number.isFinite(input.accuracyMeters) ? Math.max(0, Number(input.accuracyMeters)) : null;
    const effectiveDistance = accuracyMeters !== null ? distanceMeters - Math.min(accuracyMeters, 150) : distanceMeters;
    const withinRange = effectiveDistance <= branch.radiusMeters;

    return {
      branch,
      accuracyMeters,
      distanceMeters,
      distanceLabel: formatDistanceLabel(distanceMeters),
      withinRange
    };
  }).sort((left, right) => left.distanceMeters - right.distanceMeters);

  const nearestBranch = branches[0] || null;
  const matchedBranch = branches.find((entry) => entry.withinRange) || null;
  const activeBranch = matchedBranch || nearestBranch;

  return {
    branches,
    nearestBranch,
    matchedBranch,
    activeBranch,
    withinRange: Boolean(matchedBranch),
    message: matchedBranch
      ? `You are inside the check-in zone for ${matchedBranch.branch.label}.`
      : activeBranch
        ? `You are ${activeBranch.distanceLabel} away from ${activeBranch.branch.label}. Move closer to check in.`
        : 'No gym branches are configured yet.'
  };
}
