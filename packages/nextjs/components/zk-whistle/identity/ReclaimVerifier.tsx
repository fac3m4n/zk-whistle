"use client";

import { useCallback, useState } from "react";
import { ArrowTopRightOnSquareIcon, CheckCircleIcon, FingerPrintIcon } from "@heroicons/react/24/outline";
import { useReclaimProof } from "~~/hooks/zk-whistle/useReclaimProof";
import { RECLAIM_PROVIDERS, type ReclaimProviderKey } from "~~/services/zk-whistle/reclaimProtocol";

const PROVIDER_INFO: Record<ReclaimProviderKey, { label: string; description: string }> = {
  TWITTER_ACCOUNT: {
    label: "Twitter / X Account",
    description: "Prove ownership of a Twitter account without revealing your handle.",
  },
  LINKEDIN_EMPLOYMENT: {
    label: "LinkedIn Employment",
    description: "Prove current employment at an organization without revealing your name.",
  },
  GITHUB_CONTRIBUTION: {
    label: "GitHub Contributor",
    description: "Prove you are a contributor to a specific repository.",
  },
  GOOGLE_WORKSPACE: {
    label: "Google Workspace",
    description: "Prove membership in a Google Workspace organization.",
  },
};

/**
 * Reclaim Protocol verification component.
 * Users select a provider, initiate a zkTLS verification session,
 * and upon success, submit the proof hash on-chain.
 */
export const ReclaimVerifier = () => {
  const {
    isInitializing,
    isVerifying,
    isSubmitting,
    error,
    requestUrl,
    proof,
    proofHash,
    startVerification,
    submitProofOnChain,
    getProofSummary,
    reset,
  } = useReclaimProof();

  const [selectedProvider, setSelectedProvider] = useState<ReclaimProviderKey | null>(null);

  const handleStartVerification = useCallback(
    async (providerKey: ReclaimProviderKey) => {
      setSelectedProvider(providerKey);
      const providerId = RECLAIM_PROVIDERS[providerKey];
      await startVerification(providerId);
    },
    [startVerification],
  );

  const handleSubmit = useCallback(async () => {
    const success = await submitProofOnChain();
    if (success) {
      reset();
      setSelectedProvider(null);
    }
  }, [submitProofOnChain, reset]);

  // Step 1: Select provider
  if (!selectedProvider && !proof) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Verification Type</h3>
        <p className="text-base-content/70 text-sm">
          Choose which credential you want to verify. Your identity remains anonymous -- only the proof of the
          credential is recorded.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(PROVIDER_INFO) as ReclaimProviderKey[]).map(key => (
            <button
              key={key}
              className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer text-left"
              onClick={() => handleStartVerification(key)}
              disabled={isInitializing}
            >
              <div className="card-body p-4">
                <div className="flex items-center gap-2">
                  <FingerPrintIcon className="h-5 w-5 text-secondary" />
                  <span className="font-medium">{PROVIDER_INFO[key].label}</span>
                </div>
                <p className="text-xs text-base-content/60 mt-1">{PROVIDER_INFO[key].description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: User verifying via Reclaim
  if (isVerifying && requestUrl && !proof) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Verify Your Credential</h3>
        <div className="alert alert-info">
          <span>Open the link below to complete verification via Reclaim Protocol.</span>
        </div>
        <a href={requestUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block">
          <ArrowTopRightOnSquareIcon className="h-5 w-5" />
          Open Verification Link
        </a>
        <div className="flex items-center justify-center gap-2 text-base-content/50">
          <span className="loading loading-dots loading-sm"></span>
          <span className="text-sm">Waiting for verification to complete...</span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            reset();
            setSelectedProvider(null);
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Step 3: Proof received -- submit on-chain
  if (proof && proofHash) {
    return (
      <div className="space-y-4">
        <div className="alert alert-success">
          <CheckCircleIcon className="h-6 w-6" />
          <div>
            <h3 className="font-bold">Proof Verified!</h3>
            <p className="text-sm">{getProofSummary(proof)}</p>
          </div>
        </div>

        <div className="bg-base-200 rounded-xl p-4">
          <p className="text-sm font-medium mb-1">Proof Hash (for on-chain registration):</p>
          <p className="font-mono text-xs break-all">{proofHash}</p>
        </div>

        <div className="flex gap-3">
          <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : "Submit Proof Hash On-Chain"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              reset();
              setSelectedProvider(null);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <span className="loading loading-spinner loading-lg text-secondary"></span>
      <p>Initializing verification session...</p>
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
