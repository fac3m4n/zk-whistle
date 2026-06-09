"use client";

import { useCallback, useState } from "react";
import {
  buildDeadMansSwitchACC,
  decryptKeyFromLit,
  encryptKeyWithLit,
  getDecryptAuthContext,
  isLitSupportedChain,
  litChainNameFromId,
} from "~~/services/zk-whistle/litProtocol";
import type { LitAccessControlCondition, LitEncryptedKey } from "~~/types/zk-whistle";

type LitProtocolState = {
  isEncrypting: boolean;
  isDecrypting: boolean;
  error: string | null;
};

/**
 * React hook for Lit Protocol key management (SDK v8 / Naga).
 *
 * Connection is lazy: the Naga client is created on first encrypt/decrypt call,
 * not on mount, so pages that never use Lit don't pay the handshake cost.
 */
export function useLitProtocol() {
  const [state, setState] = useState<LitProtocolState>({
    isEncrypting: false,
    isDecrypting: false,
    error: null,
  });

  /** Encrypt an AES key under the given conditions on a Lit-supported `chain`. */
  const encryptKey = useCallback(
    async (
      symmetricKey: Uint8Array,
      accessControlConditions: LitAccessControlCondition[],
      chain: string,
    ): Promise<LitEncryptedKey | null> => {
      setState(prev => ({ ...prev, isEncrypting: true, error: null }));
      try {
        const result = await encryptKeyWithLit(symmetricKey, accessControlConditions, chain);
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

  /** Decrypt an AES key from Lit using a wallet-authenticated `authContext`. */
  const decryptKey = useCallback(
    async (
      encryptedKey: LitEncryptedKey,
      accessControlConditions: LitAccessControlCondition[],
      authContext: unknown,
      chain: string,
    ): Promise<Uint8Array | null> => {
      setState(prev => ({ ...prev, isDecrypting: true, error: null }));
      try {
        const result = await decryptKeyFromLit(encryptedKey, accessControlConditions, authContext, chain);
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
    getDecryptAuthContext,
    isLitSupportedChain,
    litChainNameFromId,
  };
}
