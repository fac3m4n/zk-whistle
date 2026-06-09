"use client";

import { useCallback, useState } from "react";
import { transformForOnchain } from "@reclaimprotocol/js-sdk";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import {
  getProofSummary,
  hashProof,
  initReclaimSession,
  verifyProofLocally,
} from "~~/services/zk-whistle/reclaimProtocol";
import type { ReclaimProof } from "~~/types/zk-whistle";
import { notification } from "~~/utils/scaffold-eth";

type ReclaimProofState = {
  isInitializing: boolean;
  isVerifying: boolean;
  isSubmitting: boolean;
  error: string | null;
  requestUrl: string | null;
  proof: ReclaimProof | null;
  proofHash: string | null;
};

/**
 * React hook for Reclaim Protocol proof generation and on-chain submission.
 * Manages the full lifecycle: init session -> user verifies -> submit hash on-chain.
 */
export function useReclaimProof() {
  const { address } = useAccount();
  const { writeContractAsync: writeRegistryAsync, isPending: isRegistryPending } =
    useScaffoldWriteContract("WhistleblowerRegistry");

  const [state, setState] = useState<ReclaimProofState>({
    isInitializing: false,
    isVerifying: false,
    isSubmitting: false,
    error: null,
    requestUrl: null,
    proof: null,
    proofHash: null,
  });

  /**
   * Start a Reclaim verification session.
   * Returns a URL that the user should open to perform the verification.
   */
  const startVerification = useCallback(async (providerId: string): Promise<string | null> => {
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      const session = await initReclaimSession(providerId);

      // Set up the success callback
      session.onSuccess(async proofs => {
        const proof = Array.isArray(proofs) ? proofs[0] : proofs;
        if (proof) {
          const verified = await verifyProofLocally(proof as ReclaimProof);
          if (verified) {
            const hash = hashProof(proof as ReclaimProof);
            setState(prev => ({
              ...prev,
              isVerifying: false,
              proof: proof as ReclaimProof,
              proofHash: hash,
            }));
            notification.success("Proof verified successfully!");
          } else {
            setState(prev => ({
              ...prev,
              isVerifying: false,
              error: "Proof verification failed",
            }));
          }
        }
      });

      setState(prev => ({
        ...prev,
        isInitializing: false,
        isVerifying: true,
        requestUrl: session.requestUrl,
      }));

      return session.requestUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize verification";
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: message,
      }));
      return null;
    }
  }, []);

  /**
   * Submit the proof hash to the WhistleblowerRegistry contract.
   */
  const submitProofOnChain = useCallback(async (): Promise<boolean> => {
    if (!state.proofHash || !address) {
      notification.error("No proof to submit or wallet not connected");
      return false;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      await writeRegistryAsync({
        functionName: "submitProofHash",
        args: [state.proofHash as `0x${string}`],
      });

      setState(prev => ({ ...prev, isSubmitting: false }));
      notification.success("Proof hash submitted on-chain!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "On-chain submission failed";
      setState(prev => ({ ...prev, isSubmitting: false, error: message }));
      notification.error(message);
      return false;
    }
  }, [state.proofHash, address, writeRegistryAsync]);

  /**
   * Submit the full proof for trustless on-chain verification. The Reclaim
   * verifier checks witness signatures on-chain; verification accrues to the
   * proof's owner. Requires a Reclaim verifier to be configured on the registry.
   */
  const submitVerifiedProofOnChain = useCallback(async (): Promise<boolean> => {
    if (!state.proof || !address) {
      notification.error("No proof to submit or wallet not connected");
      return false;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const { claimInfo, signedClaim } = transformForOnchain(state.proof as any);
      await writeRegistryAsync({
        functionName: "submitVerifiedProof",

        args: [{ claimInfo, signedClaim } as any],
      });

      setState(prev => ({ ...prev, isSubmitting: false }));
      notification.success("Proof verified on-chain!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "On-chain verification failed";
      setState(prev => ({ ...prev, isSubmitting: false, error: message }));
      notification.error(message);
      return false;
    }
  }, [state.proof, address, writeRegistryAsync]);

  const reset = useCallback(() => {
    setState({
      isInitializing: false,
      isVerifying: false,
      isSubmitting: false,
      error: null,
      requestUrl: null,
      proof: null,
      proofHash: null,
    });
  }, []);

  return {
    ...state,
    isRegistryPending,
    startVerification,
    submitProofOnChain,
    submitVerifiedProofOnChain,
    reset,
    getProofSummary,
  };
}
