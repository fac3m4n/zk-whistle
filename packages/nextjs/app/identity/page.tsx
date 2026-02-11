"use client";

import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { FingerPrintIcon } from "@heroicons/react/24/outline";
import { ReclaimVerifier } from "~~/components/zk-whistle/identity/ReclaimVerifier";
import { VerificationBadge } from "~~/components/zk-whistle/identity/VerificationBadge";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const IdentityPage: NextPage = () => {
  const { address } = useAccount();

  const { data: userProfile, isLoading } = useScaffoldReadContract({
    contractName: "WhistleblowerRegistry",
    functionName: "getUserProfile",
    args: [address],
  });

  const isVerified = userProfile?.[1] ?? false;
  const proofCount = Number(userProfile?.[0]?.length ?? 0);
  const registeredAt = Number(userProfile?.[2] ?? 0n);

  return (
    <div className="flex flex-col items-center grow pt-10 px-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <FingerPrintIcon className="h-8 w-8 text-secondary" />
            <h1 className="text-3xl font-bold">Identity & Reputation</h1>
          </div>
          <p className="text-base-content/70 mt-2">
            Prove your credibility without revealing who you are. Use Reclaim Protocol (zkTLS) to verify credentials
            with zero-knowledge proofs.
          </p>
        </div>

        {!address ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-16">
              <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
              <p className="text-base-content/70">Connect a wallet to manage your identity proofs.</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h2 className="card-title">Your Verification Status</h2>
                  <VerificationBadge isVerified={isVerified} proofCount={proofCount} size="lg" />
                </div>

                {isVerified && (
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/70">Registered:</span>
                      <span>{new Date(registeredAt * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/70">Proofs on-chain:</span>
                      <span className="font-mono">{proofCount}</span>
                    </div>

                    {/* List proof hashes */}
                    {userProfile?.[0] && userProfile[0].length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-base-content/70 mb-2">Proof Hashes:</p>
                        <div className="space-y-1">
                          {userProfile[0].map((hash: string, idx: number) => (
                            <div key={idx} className="bg-base-200 rounded-lg px-3 py-2">
                              <p className="font-mono text-xs truncate">{hash}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isVerified && (
                  <p className="text-sm text-base-content/50 mt-2">
                    No proofs submitted yet. Use the verifier below to establish your credentials.
                  </p>
                )}
              </div>
            </div>

            {/* Verification Widget */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">Add New Verification</h2>
                <ReclaimVerifier />
              </div>
            </div>

            {/* Info Section */}
            <div className="bg-base-200 rounded-2xl p-6">
              <h3 className="font-semibold mb-3">How zkTLS Verification Works</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-base-content/70">
                <li>Select a verification type (Twitter, LinkedIn, etc.).</li>
                <li>Log into the service through the Reclaim Protocol widget.</li>
                <li>
                  A zero-knowledge proof is generated from the encrypted HTTPS session, proving you have access without
                  revealing your identity.
                </li>
                <li>The proof hash is stored on-chain as your credential. The full proof stays off-chain.</li>
                <li>Journalists can see you are a &quot;Verified Source&quot; without knowing who you are.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentityPage;
