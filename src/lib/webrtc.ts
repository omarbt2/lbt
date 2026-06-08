export const ICE_SERVERS: RTCIceServer[] = [
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

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch('/api/turn-credentials');
    if (res.ok) {
      const { iceServers } = await res.json();
      return iceServers;
    }
  } catch { /* fallback */ }
  return ICE_SERVERS;
}

export function createPeerConnection(iceServers?: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: iceServers ?? ICE_SERVERS });
}
