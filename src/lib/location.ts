export type CoordinatesInput = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export type GymBranchConfig = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  mapsUrl: string;
};

export const DEFAULT_GYM_BRANCHES: GymBranchConfig[] = [
  {
    id: 'powerhouse-branch-1',
    label: 'Power House Gym Indira Chowk Branch',
    latitude: 28.0320613,
    longitude: 79.1316603,
    radiusMeters: 150,
    mapsUrl: 'https://www.google.com/maps/place/Power+House+Gym/@28.0320613,79.1316603,17z/data=!3m1!4b1!4m6!3m5!1s0x397545eae4106853:0xd8f6742e12db8be2!8m2!3d28.0320613!4d79.1316603!16s%2Fg%2F11fxzs7lbs?authuser=0&hl=en&entry=ttu&g_ep=EgoyMDI2MDMyNC4wIKXMDSoASAFQAw%3D%3D'
  },
  {
    id: 'powerhouse-branch-2',
    label: 'Power House Gym Pathik Chowk Branch (Rajendra Complex)',
    latitude: 28.0429756,
    longitude: 79.1271526,
    radiusMeters: 150,
    mapsUrl: 'https://www.google.com/maps/place/Power+House+Gym/data=!4m7!3m6!1s0x397545862e915073:0x7af65aec0e6bc596!8m2!3d28.0429756!4d79.1271526!16s%2Fg%2F11j337_6qn!19sChIJc1CRLoZFdTkRlsVrDuxa9no?authuser=0&hl=en&rclk=1'
  }
];

export function getDistanceInMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const phiA = toRadians(latitudeA);
  const phiB = toRadians(latitudeB);
  const deltaPhi = toRadians(latitudeB - latitudeA);
  const deltaLambda = toRadians(longitudeB - longitudeA);

  const a =
    Math.sin(deltaPhi / 2) ** 2
    + Math.cos(phiA) * Math.cos(phiB) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function openDirections(latitude: number, longitude: number) {
  if (typeof window === 'undefined') {
    return;
  }

  window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank', 'noopener,noreferrer');
}

export function openBranchDirections(branch: GymBranchConfig) {
  if (typeof window === 'undefined') {
    return;
  }

  window.open(branch.mapsUrl || `https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`, '_blank', 'noopener,noreferrer');
}

export function getUserLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not supported on this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => reject(new Error(error.message || 'We could not read your location.')),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 15_000
      }
    );
  });
}

export function formatDistanceLabel(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters)) {
    return '';
  }

  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10_000 ? 0 : 1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

export function getLocalDistanceSummary(
  user: CoordinatesInput,
  branch: GymBranchConfig
) {
  const distanceMeters = getDistanceInMeters(
    user.latitude,
    user.longitude,
    branch.latitude,
    branch.longitude
  );

  return {
    branch,
    distanceMeters,
    withinRange: distanceMeters <= branch.radiusMeters,
    distanceLabel: formatDistanceLabel(distanceMeters)
  };
}

export function getNearestGymBranchSummary(
  user: CoordinatesInput,
  branches: GymBranchConfig[]
) {
  const candidates = branches.map((branch) => getLocalDistanceSummary(user, branch));
  const nearest = candidates.sort((left, right) => left.distanceMeters - right.distanceMeters)[0] || null;

  if (!nearest) {
    return null;
  }

  const matched = candidates.find((candidate) => candidate.withinRange) || nearest;

  return {
    nearest,
    matched,
    candidates
  };
}
