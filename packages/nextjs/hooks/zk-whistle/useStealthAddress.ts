"use client";

import { useCallback, useState } from "react";
import {
  createStealthMetaAddress,
  deriveStealthAddress,
  generateStealthKeyPair,
  parseStealthMetaAddress,
  serializeStealthMetaAddress,
} from "~~/services/zk-whistle/stealthAddress";
import type { StealthKeyPair, StealthMetaAddress, StealthPaymentInfo } from "~~/types/zk-whistle";

type StealthAddressState = {
  keyPair: StealthKeyPair | null;
  metaAddress: StealthMetaAddress | null;
  serializedMetaAddress: string | null;
  error: string | null;
};

/**
 * React hook for ERC-5564 stealth address operations.
 * Manages key generation, meta-address creation, and stealth address derivation.
 */
export function useStealthAddress() {
  const [state, setState] = useState<StealthAddressState>({
    keyPair: null,
    metaAddress: null,
    serializedMetaAddress: null,
    error: null,
  });

  /**
   * Generate a new stealth key pair and meta-address.
   * WARNING: The private keys must be stored securely by the user.
   */
  const generateKeys = useCallback((): StealthKeyPair => {
    try {
      const keyPair = generateStealthKeyPair();
      const metaAddress = createStealthMetaAddress(keyPair);
      const serialized = serializeStealthMetaAddress(metaAddress);

      setState({
        keyPair,
        metaAddress,
        serializedMetaAddress: serialized,
        error: null,
      });

      return keyPair;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Key generation failed";
      setState(prev => ({ ...prev, error: message }));
      throw err;
    }
  }, []);

  /**
   * Derive a stealth address for payment (used by journalist/sender).
   */
  const deriveAddress = useCallback((serializedMetaAddress: string): StealthPaymentInfo | null => {
    try {
      const metaAddress = parseStealthMetaAddress(serializedMetaAddress);
      return deriveStealthAddress(metaAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Address derivation failed";
      setState(prev => ({ ...prev, error: message }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      keyPair: null,
      metaAddress: null,
      serializedMetaAddress: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    generateKeys,
    deriveAddress,
    reset,
  };
}
