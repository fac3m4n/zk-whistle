"use client";

import { useCallback, useState } from "react";
import { decryptPayload, deserializePayload, encryptFile, serializePayload } from "~~/services/zk-whistle/encryption";
import type { EncryptedPayload } from "~~/types/zk-whistle";

type EncryptionState = {
  isEncrypting: boolean;
  isDecrypting: boolean;
  error: string | null;
  encryptedPayload: EncryptedPayload | null;
  decryptedData: Uint8Array | null;
};

/**
 * React hook for client-side AES-256-GCM file encryption/decryption.
 * Wraps the encryption service with React state management.
 */
export function useClientEncryption() {
  const [state, setState] = useState<EncryptionState>({
    isEncrypting: false,
    isDecrypting: false,
    error: null,
    encryptedPayload: null,
    decryptedData: null,
  });

  /**
   * Encrypt a file and store the result in state.
   */
  const encrypt = useCallback(async (file: File): Promise<EncryptedPayload | null> => {
    setState(prev => ({ ...prev, isEncrypting: true, error: null }));

    try {
      const payload = await encryptFile(file);
      setState(prev => ({
        ...prev,
        isEncrypting: false,
        encryptedPayload: payload,
      }));
      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Encryption failed";
      setState(prev => ({
        ...prev,
        isEncrypting: false,
        error: message,
      }));
      return null;
    }
  }, []);

  /**
   * Decrypt an encrypted payload using the raw key bytes.
   */
  const decrypt = useCallback(async (payload: EncryptedPayload, rawKey: Uint8Array): Promise<Uint8Array | null> => {
    setState(prev => ({ ...prev, isDecrypting: true, error: null }));

    try {
      const data = await decryptPayload(payload, rawKey);
      setState(prev => ({
        ...prev,
        isDecrypting: false,
        decryptedData: data,
      }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Decryption failed";
      setState(prev => ({
        ...prev,
        isDecrypting: false,
        error: message,
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isEncrypting: false,
      isDecrypting: false,
      error: null,
      encryptedPayload: null,
      decryptedData: null,
    });
  }, []);

  return {
    ...state,
    encrypt,
    decrypt,
    reset,
    serializePayload,
    deserializePayload,
  };
}
