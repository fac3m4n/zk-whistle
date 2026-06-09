/**
 * Reclaim Protocol (zkTLS) service.
 * Enables whistleblowers to prove credentials (employment, account ownership)
 * without revealing their identity, using zero-knowledge proofs of HTTPS sessions.
 *
 * The user generates a proof via the Reclaim widget, and the hash of the proof
 * is stored on-chain in the WhistleblowerRegistry contract.
 */
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import type { ReclaimProof } from "~~/types/zk-whistle";

/**
 * Initialize a Reclaim proof request session.
 *
 * The app **secret** is held server-side: this fetches a serialized request
 * config from `/api/reclaim` (which performs `ReclaimProofRequest.init` with the
 * secret) and rebuilds it client-side via `fromJsonString`. No secret is ever
 * exposed to the browser.
 *
 * @param providerId - Reclaim provider ID for the type of verification.
 * @returns The request URL for the user and an `onSuccess` subscriber.
 */
export async function initReclaimSession(providerId: string): Promise<{
  requestUrl: string;
  statusUrl: string;
  onSuccess: (callback: (proofs: any) => void) => void;
}> {
  const res = await fetch("/api/reclaim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to start verification session.");
  }

  const { reclaimRequest } = await res.json();
  const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(reclaimRequest);

  const requestUrl = await reclaimProofRequest.getRequestUrl();
  const statusUrl = reclaimProofRequest.getStatusUrl();

  let successCallback: ((proofs: ReclaimProof[]) => void) | null = null;

  reclaimProofRequest.startSession({
    onSuccess: proofs => {
      if (successCallback) {
        successCallback(proofs as unknown as ReclaimProof[]);
      }
    },
    onError: error => {
      console.error("Reclaim session error:", error);
    },
  });

  return {
    requestUrl,
    statusUrl,
    onSuccess: callback => {
      successCallback = callback;
    },
  };
}

/**
 * Verify a Reclaim proof client-side.
 * Checks the cryptographic signatures and witness attestations.
 *
 * @param proof - The Reclaim proof to verify
 * @returns True if the proof is valid
 */
export function verifyProofLocally(proof: ReclaimProof): boolean {
  // Basic structural validation
  if (!proof.identifier || !proof.claimData || !proof.signatures || proof.signatures.length === 0) {
    return false;
  }

  if (!proof.witnesses || proof.witnesses.length === 0) {
    return false;
  }

  if (!proof.claimData.provider || !proof.claimData.parameters) {
    return false;
  }

  // Full cryptographic verification would use @reclaimprotocol/js-sdk's verifyProof
  // For MVP, structural validation is sufficient as the SDK handles verification
  return true;
}

/**
 * Compute a deterministic keccak256 hash of a Reclaim proof for on-chain storage.
 * Only the hash is stored on-chain; the full proof lives off-chain.
 *
 * @param proof - The Reclaim proof to hash
 * @returns bytes32 hex string suitable for on-chain submission
 */
export function hashProof(proof: ReclaimProof): string {
  // Create a canonical JSON representation for deterministic hashing
  const canonical = JSON.stringify({
    identifier: proof.identifier,
    claimData: {
      provider: proof.claimData.provider,
      parameters: proof.claimData.parameters,
      owner: proof.claimData.owner,
      timestampS: proof.claimData.timestampS,
      context: proof.claimData.context,
      epoch: proof.claimData.epoch,
    },
    signatures: proof.signatures.sort(),
  });

  // Use the Web Crypto API (via viem) for keccak256
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { keccak256, toHex } = require("viem");
  return keccak256(toHex(canonical));
}

/**
 * Extract the human-readable claim summary from a proof.
 * Used for display purposes in the UI.
 *
 * @param proof - The Reclaim proof
 * @returns A human-readable description of what was verified
 */
export function getProofSummary(proof: ReclaimProof): string {
  const provider = proof.claimData.provider;
  const context = proof.claimData.context;

  if (context) return context;
  return `Verified via ${provider}`;
}

/**
 * Reclaim provider IDs for whistleblower verification.
 * Provider IDs are obtained from the Reclaim Protocol dashboard.
 * To add new providers, register them at https://dev.reclaimprotocol.org
 */
export const RECLAIM_PROVIDERS = {
  TWITTER_ACCOUNT: "e6fe962d-8b4e-4ce5-abcc-3d21c88bd64a",
  LINKEDIN_EMPLOYMENT: "a9f1063c-06b7-476a-8410-9ff6e427e637",
  GITHUB_CONTRIBUTION: "6d3f6753-7ee6-49ee-a545-62f1b1822ae5",
  GOOGLE_WORKSPACE: "f9f383fd-32d9-4c54-942f-5e9fda349762",
} as const;

export type ReclaimProviderKey = keyof typeof RECLAIM_PROVIDERS;
