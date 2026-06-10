import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createCallRecord, updateCallRecord } from '../lib/api/calls';
import { checkPermission, requestMicPermission } from '../lib/permissions';
import { ICE_SERVERS } from '../lib/webrtc';

export type CallState = 'idle' | 'calling' | 'ringing' | 'active' | 'ended';

export interface UseWebRTCReturn {
  callState: CallState;
  callId: string | null;
  remoteUserId: string | null;
  isMuted: boolean;
  isSpeakerOn: boolean;
  callDuration: number;
  isVideoCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (targetUserId: string, type?: 'audio' | 'video') => Promise<void>;
  answerCall: (callerId: string, callId: string, type?: 'audio' | 'video') => Promise<void>;
  endCall: () => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleCamera: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
};

export function useWebRTC(
  currentUserId: string,
  onIncomingCall?: (callerId: string, callId: string, callType: string) => void,
  onPermissionDenied?: (type: 'microphone' | 'camera') => void
): UseWebRTCReturn {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callId, setCallId] = useState<string | null>(null);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const incomingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const cleanupCall = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (callChannelRef.current) {
      try { supabase.removeChannel(callChannelRef.current); } catch {}
      callChannelRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setCallDuration(0);
  }, []);

  const removeIncomingChannel = useCallback(() => {
    if (incomingChannelRef.current) {
      try { supabase.removeChannel(incomingChannelRef.current); } catch {}
      incomingChannelRef.current = null;
    }
  }, []);

  const getMediaStream = useCallback(async (video: boolean): Promise<MediaStream> => {
    const permState = await checkPermission('microphone');
    if (permState === 'denied') {
      onPermissionDenied?.('microphone');
      throw new Error('Microphone permission denied');
    }
    if (permState === 'prompt') {
      const granted = await requestMicPermission();
      if (!granted) {
        onPermissionDenied?.('microphone');
        throw new Error('Microphone permission denied');
      }
    }
    if (video) {
      const { requestCamPermission } = await import('../lib/permissions');
      const camPermState = await checkPermission('camera');
      if (camPermState === 'denied') {
        onPermissionDenied?.('camera');
        throw new Error('Camera permission denied');
      }
      if (camPermState === 'prompt') {
        const granted = await requestCamPermission();
        if (!granted) {
          onPermissionDenied?.('camera');
          throw new Error('Camera permission denied');
        }
      }
    }
    return navigator.mediaDevices.getUserMedia({ audio: true, video });
  }, [onPermissionDenied]);

  const createPeerConnection = useCallback((stream: MediaStream, remoteId: string, currentCallId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const channel = supabase.channel(`call-${currentCallId}`);
        channel.send({
          type: 'broadcast',
          event: 'ice_candidate',
          payload: {
            senderId: currentUserIdRef.current,
            receiverId: remoteId,
            candidate: event.candidate.toJSON(),
          },
        });
        setTimeout(() => { try { supabase.removeChannel(channel); } catch {} }, 100);
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pcRef.current = pc;
    return pc;
  }, []);

  const startCall = useCallback(async (targetUserId: string, type: 'audio' | 'video' = 'audio') => {
    try {
      setCallState('calling');
      setIsVideoCall(type === 'video');
      setRemoteUserId(targetUserId);

      let result;
      try {
        result = await createCallRecord(targetUserId, type);
      } catch (e) {
        console.error('createCallRecord failed:', e);
        throw e;
      }
      const newCallId = result.id;
      callIdRef.current = newCallId;
      setCallId(newCallId);

      let stream;
      try {
        stream = await getMediaStream(type === 'video');
      } catch (e) {
        console.error('getUserMedia failed:', e);
        throw e;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(stream, targetUserId, newCallId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callChannel = supabase.channel(`call-${newCallId}`);
      callChannelRef.current = callChannel;

      await callChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await callChannel.send({
            type: 'broadcast',
            event: 'offer',
            payload: {
              senderId: currentUserIdRef.current,
              receiverId: targetUserId,
              callId: newCallId,
              callType: type,
              sdp: pc.localDescription?.toJSON(),
            },
          });
        }
      });

      callChannel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.senderId === targetUserId && pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            setCallState('active');
            durationTimerRef.current = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
            await updateCallRecord(newCallId, 'active');
          } catch (e) {
            console.error('Error setting remote description:', e);
          }
        }
      });

      callChannel.on('broadcast', { event: 'ice_candidate' }, async ({ payload }) => {
        if (payload.senderId === targetUserId && pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error('Error adding ICE candidate:', e);
          }
        }
      });

      callChannel.on('broadcast', { event: 'bye' }, async ({ payload }) => {
        if (payload.senderId === targetUserId) {
          cleanupCall();
          setCallState('ended');
          setCallId(null);
          setRemoteUserId(null);
          setTimeout(() => setCallState('idle'), 2000);
        }
      });
    } catch (e) {
      console.error('Failed to start call:', e);
      cleanupCall();
      setCallState('idle');
    }
  }, [getMediaStream, createPeerConnection, cleanupCall]);

  const answerCall = useCallback(async (callerId: string, incomingCallId: string, type: 'audio' | 'video' = 'audio') => {
    try {
      setCallState('ringing');
      setIsVideoCall(type === 'video');
      setRemoteUserId(callerId);
      callIdRef.current = incomingCallId;
      setCallId(incomingCallId);

      removeIncomingChannel();

      const stream = await getMediaStream(type === 'video');
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(stream, callerId, incomingCallId);

      const callChannel = supabase.channel(`call-${incomingCallId}`);
      callChannelRef.current = callChannel;

      await callChannel.subscribe();

      callChannel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.senderId === callerId && pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);

            await callChannel.send({
              type: 'broadcast',
              event: 'answer',
              payload: {
                senderId: currentUserIdRef.current,
                receiverId: callerId,
                callId: incomingCallId,
                sdp: pcRef.current.localDescription?.toJSON(),
              },
            });

            setCallState('active');
            durationTimerRef.current = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
            await updateCallRecord(incomingCallId, 'active');
          } catch (e) {
            console.error('Error answering call:', e);
          }
        }
      });

      callChannel.on('broadcast', { event: 'ice_candidate' }, async ({ payload }) => {
        if (payload.senderId === callerId && pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error('Error adding ICE candidate:', e);
          }
        }
      });

      callChannel.on('broadcast', { event: 'bye' }, async ({ payload }) => {
        if (payload.senderId === callerId) {
          cleanupCall();
          setCallState('ended');
          setCallId(null);
          setRemoteUserId(null);
          setTimeout(() => setCallState('idle'), 2000);
        }
      });
    } catch (e) {
      console.error('Failed to answer call:', e);
      cleanupCall();
      setCallState('idle');
    }
  }, [getMediaStream, createPeerConnection, cleanupCall, removeIncomingChannel]);

  const endCall = useCallback(async () => {
    try {
      if (callIdRef.current && callChannelRef.current) {
        await callChannelRef.current.send({
          type: 'broadcast',
          event: 'bye',
          payload: {
            senderId: currentUserIdRef.current,
            receiverId: remoteUserId,
          },
        });
        await updateCallRecord(callIdRef.current, 'ended', callDuration);
      }
    } catch (e) {
      console.error('Error ending call:', e);
    }
    cleanupCall();
    setCallState('ended');
    setCallId(null);
    setRemoteUserId(null);
    setTimeout(() => setCallState('idle'), 2000);
  }, [remoteUserId, callDuration, cleanupCall]);

  const rejectCallHandler = useCallback(async (rejectCallId: string) => {
    try {
      await updateCallRecord(rejectCallId, 'rejected');
    } catch (e) {
      console.error('Error rejecting call:', e);
    }
    setCallState('idle');
    setCallId(null);
    setRemoteUserId(null);
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const incomingChannel = supabase
      .channel(`incoming-${currentUserId}`)
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload.receiverId === currentUserId && onIncomingCall) {
          onIncomingCall(payload.senderId, payload.callId, payload.callType);
        }
      })
      .subscribe();

    incomingChannelRef.current = incomingChannel;

    return () => {
      removeIncomingChannel();
      cleanupCall();
    };
  }, [currentUserId, onIncomingCall, removeIncomingChannel, cleanupCall]);

  return {
    callState,
    callId,
    remoteUserId,
    isMuted,
    isSpeakerOn,
    callDuration,
    isVideoCall,
    localStream,
    remoteStream,
    startCall,
    answerCall,
    endCall,
    rejectCall: rejectCallHandler,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
  };
}
