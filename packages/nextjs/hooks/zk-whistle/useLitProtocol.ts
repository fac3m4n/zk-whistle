"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildDeadMansSwitchACC,
  decryptKeyFromLit,
  disconnectLitClient,
  encryptKeyWithLit,
  initLitClient,
} from "~~/services/zk-whistle/litProtocol";
import type { LitAccessControlCondition, LitEncryptedKey } from "~~/types/zk-whistle";

type LitProtocolState = {
  isConnected: boolean;
  isEncrypting: boolean;
  isDecrypting: boolean;
  error: string | null;
};

/**
 * React hook for Lit Protocol key management.
 * Manages the Lit client lifecycle and provides encrypt/decrypt operations.
 */
export function useLitProtocol() {
  const [state, setState] = useState<LitProtocolState>({
    isConnected: false,
    isEncrypting: false,
    isDecrypting: false,
    error: null,
  });

  // Auto-connect on mount
  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        await initLitClient();
        if (mounted) {
          setState(prev => ({ ...prev, isConnected: true }));
        }
      } catch (err) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: `Lit connection failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          }));
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      disconnectLitClient();
    };
  }, []);

  /**
   * Encrypt an AES key using Lit Protocol ACCs.
   */
  const encryptKey = useCallback(
    async (
      symmetricKey: Uint8Array,
      accessControlConditions: LitAccessControlCondition[],
    ): Promise<LitEncryptedKey | null> => {
      setState(prev => ({ ...prev, isEncrypting: true, error: null }));

      try {
        const result = await encryptKeyWithLit(symmetricKey, accessControlConditions);
        setState(prev => ({ ...prev, isEncrypting: false }));
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Lit encryption failed";
        setState(prev => ({ ...prev, isEncrypting: false, error: message }));
        return null;
      }
    },
    [],
  );

  /**
   * Decrypt an AES key from Lit Protocol.
   */
  const decryptKey = useCallback(
    async (
      encryptedKey: LitEncryptedKey,
      accessControlConditions: LitAccessControlCondition[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionSigs: Record<string, any>,
    ): Promise<Uint8Array | null> => {
      setState(prev => ({ ...prev, isDecrypting: true, error: null }));

      try {
        const result = await decryptKeyFromLit(encryptedKey, accessControlConditions, sessionSigs);
        setState(prev => ({ ...prev, isDecrypting: false }));
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Lit decryption failed";
        setState(prev => ({ ...prev, isDecrypting: false, error: message }));
        return null;
      }
    },
    [],
  );

  return {
    ...state,
    encryptKey,
    decryptKey,
    buildDeadMansSwitchACC,
  };
}
