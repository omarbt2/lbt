// BUG #4 NOTE: These are the *publicly published* credentials for the free
// OpenRelay TURN service (https://www.metered.ca/tools/openrelay/) — they are
// not a secret belonging to this project, but they are low-quality/unreliable
// and shared by everyone on the internet. They are kept ONLY as a last-resort
// fallback if the backend TURN endpoint is unreachable. Real calls should get
// short-lived, per-session credentials from `/api/turn-credentials` via
// `fetchIceServers()` / `getIceServers()` below — never hardcode private
// TURN credentials in client-side source.
const PUBLIC_FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turns:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// Kept for backwards compatibility with existing imports; equals the public
// fallback set. Prefer `getIceServers()` for new/updated call sites.
export const ICE_SERVERS: RTCIceServer[] = PUBLIC_FALLBACK_ICE_SERVERS;

let cachedIceServers: RTCIceServer[] | null = null;
let cacheExpiresAt = 0;
const ICE_CACHE_TTL_MS = 5 * 60 * 1000; // re-fetch every 5 minutes (TURN creds are short-lived)

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch('/api/turn-credentials');
    if (res.ok) {
      const { iceServers } = await res.json();
      if (Array.isArray(iceServers) && iceServers.length > 0) {
        return iceServers;
      }
    }
  } catch { /* fallback */ }
  return PUBLIC_FALLBACK_ICE_SERVERS;
}

// BUG #4 FIX: cached helper so every call doesn't need to be updated to await
// fetchIceServers() individually — call sites should use this to get
// dynamically-issued credentials with the public servers only as a fallback.
export async function getIceServers(): Promise<RTCIceServer[]> {
  const now = Date.now();
  if (cachedIceServers && now < cacheExpiresAt) {
    return cachedIceServers;
  }
  const servers = await fetchIceServers();
  cachedIceServers = servers;
  cacheExpiresAt = now + ICE_CACHE_TTL_MS;
  return servers;
}

export function createPeerConnection(iceServers?: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: iceServers ?? PUBLIC_FALLBACK_ICE_SERVERS });
}
