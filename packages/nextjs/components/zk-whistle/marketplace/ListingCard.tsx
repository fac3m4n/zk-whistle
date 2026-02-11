"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { VerificationBadge } from "~~/components/zk-whistle/identity/VerificationBadge";

type ListingCardProps = {
  listingId: number;
  descriptionHash: string;
  minimumBid: bigint;
  isActive: boolean;
  isVerified: boolean;
  createdAt: bigint;
  bidCount: number;
};

/**
 * Card component displaying a marketplace listing summary.
 */
export const ListingCard = ({
  listingId,
  descriptionHash,
  minimumBid,
  isActive,
  isVerified,
  createdAt,
  bidCount,
}: ListingCardProps) => {
  return (
    <Link href={`/marketplace/${listingId}`} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-base-content/50">#{listingId}</span>
          <div className="flex items-center gap-2">
            {!isActive && <span className="badge badge-ghost badge-sm">Closed</span>}
            <VerificationBadge isVerified={isVerified} size="sm" />
          </div>
        </div>

        <div className="mt-2">
          <p className="text-sm text-base-content/70 truncate">
            {descriptionHash.length > 50 ? `${descriptionHash.substring(0, 50)}...` : descriptionHash}
          </p>
        </div>

        <div className="divider my-2"></div>

        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="text-base-content/50">Min Bid: </span>
            <span className="font-semibold">{formatEther(minimumBid)} ETH</span>
          </div>
          <div>
            <span className="text-base-content/50">Bids: </span>
            <span className="font-semibold">{bidCount}</span>
          </div>
        </div>

        <div className="text-xs text-base-content/40 mt-2">
          Listed {new Date(Number(createdAt) * 1000).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
};
