"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { VerificationBadge } from "~~/components/zk-whistle/identity/VerificationBadge";
import { BidForm } from "~~/components/zk-whistle/marketplace/BidForm";
import { StealthPayment } from "~~/components/zk-whistle/marketplace/StealthPayment";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useMarketplace } from "~~/hooks/zk-whistle/useMarketplace";
import { notification } from "~~/utils/scaffold-eth";

const ListingDetailPage = () => {
  const params = useParams();
  const listingId = BigInt(params.id as string);
  const { address } = useAccount();
  const { acceptBid, withdrawBid, isWritePending } = useMarketplace();

  const { data: listing, isLoading } = useScaffoldReadContract({
    contractName: "Marketplace",
    functionName: "getListing",
    args: [listingId],
  });

  const [selectedBidIndex, setSelectedBidIndex] = useState<number | null>(null);
  const [stealthAddr, setStealthAddr] = useState<string>("");

  const isOwner = listing?.[0]?.toLowerCase() === address?.toLowerCase();
  const bidCount = Number(listing?.[7] ?? 0n);

  const handleAcceptBid = useCallback(async () => {
    if (selectedBidIndex === null || !stealthAddr) {
      notification.error("Select a bid and provide a stealth address");
      return;
    }

    try {
      await acceptBid(listingId, BigInt(selectedBidIndex), stealthAddr);
      notification.success("Bid accepted! Funds sent to stealth address.");
    } catch (err) {
      notification.error(`Accept failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [listingId, selectedBidIndex, stealthAddr, acceptBid]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center py-16">
        <h2 className="text-xl font-semibold">Listing not found</h2>
        <Link href="/marketplace" className="btn btn-ghost mt-4">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center grow pt-10 px-4">
      <div className="w-full max-w-3xl">
        <Link href="/marketplace" className="btn btn-ghost btn-sm mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Marketplace
        </Link>

        {/* Listing Details */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Listing #{params.id}</h1>
              <div className="flex items-center gap-2">
                {!listing[4] && <span className="badge badge-ghost">Closed</span>}
                <VerificationBadge isVerified={listing[5]} size="md" />
              </div>
            </div>

            <div className="divider"></div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-base-content/70">Whistleblower:</span>
                <Address address={listing[0]} />
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Description:</span>
                <span className="font-mono text-sm truncate max-w-[300px]">{listing[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Arweave TX:</span>
                <span className="font-mono text-sm truncate max-w-[300px]">{listing[2]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Minimum Bid:</span>
                <span className="font-semibold">{formatEther(listing[3])} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Total Bids:</span>
                <span className="font-semibold">{bidCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Created:</span>
                <span>{new Date(Number(listing[6]) * 1000).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bids Section */}
        {bidCount > 0 && (
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title">Bids</h2>
              <div className="space-y-3">
                {Array.from({ length: bidCount }, (_, i) => (
                  <BidRow
                    key={i}
                    listingId={listingId}
                    bidIndex={i}
                    isOwner={isOwner}
                    isListingActive={listing[4]}
                    isSelected={selectedBidIndex === i}
                    onSelect={() => setSelectedBidIndex(i)}
                    onWithdraw={async () => {
                      try {
                        await withdrawBid(listingId, BigInt(i));
                        notification.success("Bid withdrawn successfully!");
                      } catch (err) {
                        notification.error(`Withdraw failed: ${err instanceof Error ? err.message : "Unknown"}`);
                      }
                    }}
                  />
                ))}
              </div>

              {/* Accept Bid (for owner) */}
              {isOwner && listing[4] && selectedBidIndex !== null && (
                <div className="mt-6 space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Accept Bid #{selectedBidIndex}</h3>
                  <StealthPayment mode="generate" onAddressGenerated={setStealthAddr} />
                  {stealthAddr && (
                    <button className="btn btn-success btn-block" onClick={handleAcceptBid} disabled={isWritePending}>
                      {isWritePending ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        `Accept Bid & Receive Payment`
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Place Bid (for non-owners) */}
        {!isOwner && listing[4] && (
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <BidForm listingId={listingId} minimumBid={listing[3]} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Individual bid row component */
const BidRow = ({
  listingId,
  bidIndex,
  isOwner,
  isListingActive,
  isSelected,
  onSelect,
  onWithdraw,
}: {
  listingId: bigint;
  bidIndex: number;
  isOwner: boolean;
  isListingActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onWithdraw: () => Promise<void>;
}) => {
  const { address } = useAccount();
  const { data: bid } = useScaffoldReadContract({
    contractName: "Marketplace",
    functionName: "getBid",
    args: [listingId, BigInt(bidIndex)],
  });

  if (!bid) return <div className="animate-pulse h-12 bg-base-200 rounded-lg"></div>;

  const isBidder = bid[0].toLowerCase() === address?.toLowerCase();

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        isSelected ? "bg-primary/10 border border-primary" : "bg-base-200"
      } ${bid[2] ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs">#{bidIndex}</span>
        <Address address={bid[0]} />
        <span className="font-semibold">{formatEther(bid[1])} ETH</span>
      </div>

      <div className="flex items-center gap-2">
        {bid[2] && <span className="badge badge-success badge-sm">Accepted</span>}
        {bid[3] && <span className="badge badge-ghost badge-sm">Withdrawn</span>}

        {!bid[2] && !bid[3] && isOwner && isListingActive && (
          <button className="btn btn-primary btn-xs" onClick={onSelect}>
            Select
          </button>
        )}

        {!bid[2] && !bid[3] && isBidder && (
          <button className="btn btn-ghost btn-xs" onClick={onWithdraw}>
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
};

export default ListingDetailPage;
