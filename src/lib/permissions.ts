import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export type PermState = 'granted' | 'denied' | 'prompt';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function loadNativeModule(name: string): Promise<any> {
  try {
    return await import(/* @vite-ignore */ name);
  } catch {
    return null;
  }
}

export async function checkPermission(type: 'microphone' | 'camera'): Promise<PermState> {
  if (isNative()) {
    try {
      if (type === 'microphone') {
        const mod = await loadNativeModule('@capacitor/microphone');
        if (!mod) return 'prompt';
        const s = await mod.Microphone.checkPermissions();
        return s.microphone as PermState;
      } else {
        const mod = await loadNativeModule('@capacitor/camera');
        if (!mod) return 'prompt';
        const s = await mod.Camera.checkPermissions();
        return s.camera as PermState;
      }
    } catch { return 'prompt'; }
  }
  try {
    const s = await navigator.permissions.query({ name: type as PermissionName });
    return s.state as PermState;
  } catch { return 'prompt'; }
}

export async function requestMicPermission(): Promise<boolean> {
  const current = await checkPermission('microphone');
  if (current === 'denied') return false;
  if (current === 'granted') return true;
  try {
    if (isNative()) {
      const mod = await loadNativeModule('@capacitor/microphone');
      if (!mod) return false;
      const r = await mod.Microphone.requestPermissions();
      const granted = r.microphone === 'granted';
      await (supabase.rpc as any)('save_permission_state', { p_mic: granted ? 'granted' : 'denied' });
      return granted;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    await (supabase.rpc as any)('save_permission_state', { p_mic: 'granted' });
    return true;
  } catch {
    await (supabase.rpc as any)('save_permission_state', { p_mic: 'denied' });
    return false;
  }
}

export async function requestCamPermission(): Promise<boolean> {
  const current = await checkPermission('camera');
  if (current === 'denied') return false;
  if (current === 'granted') return true;
  try {
    if (isNative()) {
      const mod = await loadNativeModule('@capacitor/camera');
      if (!mod) return false;
      const r = await mod.Camera.requestPermissions();
      const granted = r.camera === 'granted';
      await (supabase.rpc as any)('save_permission_state', { p_camera: granted ? 'granted' : 'denied' });
      return granted;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(t => t.stop());
    await (supabase.rpc as any)('save_permission_state', { p_camera: 'granted' });
    return true;
  } catch { return false; }
}

export async function requestCallPermissions(isVideo: boolean): Promise<boolean> {
  if (isNative()) {
    try {
      const micMod = await loadNativeModule('@capacitor/microphone');
      if (!micMod) return false;
      const micStatus = await micMod.Microphone.requestPermissions();
      if (micStatus.microphone !== 'granted') return false;
      if (isVideo) {
        const camMod = await loadNativeModule('@capacitor/camera');
        if (!camMod) return false;
        const camStatus = await camMod.Camera.requestPermissions();
        return camStatus.camera === 'granted';
      }
      return true;
    } catch { return false; }
  }
  try {
    const constraints: MediaStreamConstraints = { audio: true, video: isVideo };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch { return false; }
}

export function getPermissionDeniedMessage(type: 'camera' | 'microphone'): string {
  if (type === 'camera') {
    return 'Camera access denied. Please enable it in your browser settings.';
  }
  return 'Microphone access denied. Please enable it in your browser settings.';
}
