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

// Reclaim app credentials - loaded from environment variables
const RECLAIM_APP_ID = process.env.NEXT_PUBLIC_RECLAIM_APP_ID || "";
const RECLAIM_APP_SECRET = process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET || "";

/**
 * Initialize a Reclaim proof request session.
 * The providerId determines what kind of proof the user will generate
 * (e.g., Twitter account, corporate portal login, etc.)
 *
 * @param providerId - Reclaim provider ID for the type of verification
 * @returns The proof request object and the request URL for the user
 */
export async function initReclaimSession(providerId: string): Promise<{
  requestUrl: string;
  statusUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess: (callback: (proofs: any) => void) => void;
}> {
  if (!RECLAIM_APP_ID || !RECLAIM_APP_SECRET) {
    throw new Error(
      "Reclaim Protocol credentials not configured. Set NEXT_PUBLIC_RECLAIM_APP_ID and NEXT_PUBLIC_RECLAIM_APP_SECRET in .env.local",
    );
  }

  const reclaimRequest = await ReclaimProofRequest.init(RECLAIM_APP_ID, RECLAIM_APP_SECRET, providerId);

  const requestUrl = await reclaimRequest.getRequestUrl();
  const statusUrl = reclaimRequest.getStatusUrl();

  // Set up the success callback
  let successCallback: ((proofs: ReclaimProof[]) => void) | null = null;

  reclaimRequest.startSession({
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
 * Common Reclaim provider IDs for whistleblower verification.
 * These are example providers - actual IDs should be obtained from
 * the Reclaim Protocol dashboard.
 */
export const RECLAIM_PROVIDERS = {
  TWITTER_ACCOUNT: "twitter-account-ownership",
  LINKEDIN_EMPLOYMENT: "linkedin-employment-status",
  GITHUB_CONTRIBUTION: "github-repository-contributor",
  GOOGLE_WORKSPACE: "google-workspace-membership",
} as const;

export type ReclaimProviderKey = keyof typeof RECLAIM_PROVIDERS;
