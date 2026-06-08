import { Capacitor } from '@capacitor/core';

async function loadNativeModule(name: string): Promise<any> {
  try {
    return await import(/* @vite-ignore */ name);
  } catch {
    return null;
  }
}

export async function requestMicPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const mod = await loadNativeModule('@capacitor/microphone');
      if (!mod) return false;
      const status = await mod.Microphone.requestPermissions();
      return status.microphone === 'granted';
    } catch {
      return false;
    }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const mod = await loadNativeModule('@capacitor/camera');
      if (!mod) return false;
      const status = await mod.Camera.requestPermissions();
      return status.camera === 'granted';
    } catch {
      return false;
    }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export async function requestCallPermissions(isVideo: boolean): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
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
    } catch {
      return false;
    }
  }
  try {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: isVideo,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export function getPermissionDeniedMessage(type: 'camera' | 'microphone'): string {
  if (type === 'camera') {
    return 'Camera access denied. Please enable it in your browser settings.';
  }
  return 'Microphone access denied. Please enable it in your browser settings.';
}

export async function checkExistingPermission(type: 'camera' | 'microphone'): Promise<PermissionState | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      if (type === 'camera') {
        const mod = await loadNativeModule('@capacitor/camera');
        if (!mod) return null;
        const status = await mod.Camera.checkPermissions();
        return status.camera as PermissionState;
      } else {
        const mod = await loadNativeModule('@capacitor/microphone');
        if (!mod) return null;
        const status = await mod.Microphone.checkPermissions();
        return status.microphone as PermissionState;
      }
    } catch {
      return null;
    }
  }
  try {
    const name = type === 'camera' ? 'camera' : 'microphone';
    const status = await navigator.permissions.query({ name: name as PermissionName });
    return status.state;
  } catch {
    return null;
  }
}

export async function checkPermission(type: 'microphone' | 'camera'): Promise<PermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      if (type === 'camera') {
        const mod = await loadNativeModule('@capacitor/camera');
        if (!mod) return 'prompt';
        const status = await mod.Camera.checkPermissions();
        return status.camera as PermissionState;
      } else {
        const mod = await loadNativeModule('@capacitor/microphone');
        if (!mod) return 'prompt';
        const status = await mod.Microphone.checkPermissions();
        return status.microphone as PermissionState;
      }
    } catch {
      return 'prompt';
    }
  }
  try {
    const result = await navigator.permissions.query({ name: type as PermissionName });
    return result.state;
  } catch {
    return 'prompt';
  }
}
