'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { API_URL } from '../lib/auth';

type PhotoUploadProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onError?: (message: string | null) => void;
  helperText?: string;
  uploadCategory:
    | 'signup-client'
    | 'signup-trainer'
    | 'member-record'
    | 'trainer-record'
    | 'trainer-member-request'
    | 'payment-proof-client'
    | 'profile-client'
    | 'profile-trainer'
    | 'profile-owner';
  authToken?: string;
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function PhotoUpload({
  label,
  value,
  onChange,
  onError,
  helperText,
  uploadCategory,
  authToken
}: PhotoUploadProps) {
  const pickerId = useId();
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState('');

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const setError = (message: string | null) => {
    setLocalError(message);
    onError?.(message);
  };

  const uploadFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file only.');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large. Please choose one under 2MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLocalPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return previewUrl;
    });
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set('file', file);
    formData.set('category', uploadCategory);

    try {
      const response = await fetch(`${API_URL}/api/storage/profile-image`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: formData
      });

      const json = await response.json().catch(() => ({ error: 'Could not upload image. Please try again.' }));
      if (!response.ok) {
        throw new Error(json.error || 'Could not upload image. Please try again.');
      }

      setError(null);
      onChange(String(json.publicUrl || ''));
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setLocalPreview((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return '';
      });
      setError(error instanceof Error ? error.message : 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
      if (cameraRef.current) {
        cameraRef.current.value = '';
      }
    }
  };

  const clearPhoto = () => {
    setLocalPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return '';
    });
    setError(null);
    onChange('');
  };

  const previewSrc = localPreview || value;

  return (
    <div className="photo-upload">
      <div className="photo-upload-head">
        <label htmlFor={pickerId}>{label}</label>
        <span className="subcopy">{helperText || 'Use camera or file upload. Images only, up to 2MB.'}</span>
      </div>

      <div className="photo-upload-card">
        {previewSrc ? (
          <Image className="photo-preview" src={previewSrc} alt="Selected profile" width={320} height={320} unoptimized />
        ) : (
          <div className="photo-placeholder">
            <strong>No photo selected</strong>
            <span>Choose a clear face photo.</span>
          </div>
        )}

        <div className="photo-actions">
          <input
            id={pickerId}
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => void uploadFile(event.target.files?.[0] || null)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={(event) => void uploadFile(event.target.files?.[0] || null)}
          />
          <button type="button" disabled={uploading} onClick={() => cameraRef.current?.click()}>
            {uploading ? 'Uploading...' : 'Use Camera'}
          </button>
          <button type="button" className="ghost-button" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'Please wait...' : 'Choose File'}
          </button>
          {previewSrc ? (
            <button type="button" className="ghost-button danger-button" disabled={uploading} onClick={clearPhoto}>
              Remove Photo
            </button>
          ) : null}
        </div>
      </div>

      {uploading ? <p className="notice">Uploading image...</p> : null}
      {localError ? <p className="notice error">{localError}</p> : null}
    </div>
  );
}
