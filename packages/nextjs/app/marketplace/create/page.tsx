"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useMarketplace } from "~~/hooks/zk-whistle/useMarketplace";
import { notification } from "~~/utils/scaffold-eth";

const CreateListingPage: NextPage = () => {
  const { address } = useAccount();
  const router = useRouter();
  const { createListing, isWritePending } = useMarketplace();

  const { data: isVerified } = useScaffoldReadContract({
    contractName: "WhistleblowerRegistry",
    functionName: "isVerified",
    args: [address],
  });

  const [descriptionHash, setDescriptionHash] = useState("");
  const [arweaveTxId, setArweaveTxId] = useState("");
  const [minimumBid, setMinimumBid] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!descriptionHash || !arweaveTxId) {
      notification.error("Please fill in all required fields");
      return;
    }

    try {
      await createListing(descriptionHash, arweaveTxId, minimumBid || "0", isVerified ?? false);
      notification.success("Listing created successfully!");
      router.push("/marketplace");
    } catch (err) {
      notification.error(`Failed to create listing: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [descriptionHash, arweaveTxId, minimumBid, isVerified, createListing, router]);

  if (!address) {
    return (
      <div className="flex flex-col items-center grow pt-10 px-4">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body items-center text-center">
            <p className="text-base-content/70">Connect your wallet to create a listing.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center grow pt-10 px-4">
      <div className="w-full max-w-2xl">
        <Link href="/marketplace" className="btn btn-ghost btn-sm mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Marketplace
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create Listing</h1>
          <p className="text-base-content/70 mt-1">List encrypted information for anonymous exchange.</p>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-6">
            {/* Verification Status */}
            <div className={`alert ${isVerified ? "alert-success" : "alert-warning"}`}>
              <span>
                {isVerified
                  ? "Your identity is verified. Listings will show a 'Verified Source' badge."
                  : "You are not verified. Consider verifying your identity to increase credibility."}
              </span>
              {!isVerified && (
                <Link href="/identity" className="btn btn-sm btn-ghost">
                  Verify Now
                </Link>
              )}
            </div>

            {/* Description Hash */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Description / Title</span>
                <span className="label-text-alt">Brief description of the information</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="e.g., Internal documents revealing..."
                value={descriptionHash}
                onChange={e => setDescriptionHash(e.target.value)}
              />
            </div>

            {/* Arweave TX ID */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Arweave Transaction ID</span>
                <span className="label-text-alt">TX ID of the encrypted payload on Arweave</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full font-mono"
                placeholder="Arweave TX ID"
                value={arweaveTxId}
                onChange={e => setArweaveTxId(e.target.value)}
              />
            </div>

            {/* Minimum Bid */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Minimum Bid (ETH)</span>
                <span className="label-text-alt">Set 0 for no minimum</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="input input-bordered w-full font-mono"
                placeholder="0.0"
                value={minimumBid}
                onChange={e => setMinimumBid(e.target.value)}
              />
            </div>

            <button
              className="btn btn-accent btn-block mt-4"
              onClick={handleSubmit}
              disabled={isWritePending || !descriptionHash || !arweaveTxId}
            >
              {isWritePending ? <span className="loading loading-spinner loading-sm"></span> : "Create Listing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;
