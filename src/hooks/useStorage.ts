import { useState } from 'react';
import { supabase } from '../lib/supabase';

// BUG #9 FIX: all uploads go to Supabase Storage, never URL.createObjectURL
export function useStorage() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];
  const MAX_SIZE_MB = 50;

  async function compressImage(file: File, maxWidth = 1080): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  async function _upload(
    bucketName: 'avatars' | 'post-media' | 'stories' | 'reels',
    file: File,
    folder?: string
  ): Promise<string> {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Unsupported file type.');
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`File must be under ${MAX_SIZE_MB}MB.`);
    }

    if (file.type.startsWith('image/')) {
      file = await compressImage(file);
    }

    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? 'anon';

    const filePath = folder
      ? `${folder}/${Date.now()}_${file.name}`
      : `${uid}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  const uploadFile = async (
    bucketName: 'avatars' | 'post-media' | 'stories' | 'reels',
    file: File,
    folder?: string
  ): Promise<string> => {
    setIsUploading(true);
    setError(null);
    try {
      return await _upload(bucketName, file, folder);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadBase64 = async (
    bucketName: 'avatars' | 'post-media' | 'stories' | 'reels',
    base64String: string,
    originalName?: string
  ): Promise<string> => {
    setIsUploading(true);
    setError(null);
    try {
      const arr  = base64String.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      const u8   = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      const blob = new Blob([u8], { type: mime });
      const ext  = mime.split('/')[1] || 'jpg';
      const name = originalName || `upload.${ext}`;
      const file = new File([blob], name, { type: mime });
      return await _upload(bucketName, file);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, uploadBase64, isUploading, error };
}
