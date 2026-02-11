"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BuildingStorefrontIcon, PlusIcon } from "@heroicons/react/24/outline";
import { ListingCard } from "~~/components/zk-whistle/marketplace/ListingCard";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useMarketplace } from "~~/hooks/zk-whistle/useMarketplace";

/**
 * Individual listing loader component.
 * Reads a listing by ID and renders a ListingCard.
 */
const ListingLoader = ({ listingId }: { listingId: number }) => {
  const { data: listing, isLoading } = useScaffoldReadContract({
    contractName: "Marketplace",
    functionName: "getListing",
    args: [BigInt(listingId)],
  });

  if (isLoading || !listing) {
    return (
      <div className="card bg-base-100 shadow-xl animate-pulse">
        <div className="card-body h-40"></div>
      </div>
    );
  }

  return (
    <ListingCard
      listingId={listingId}
      descriptionHash={listing[1]}
      minimumBid={listing[3]}
      isActive={listing[4]}
      isVerified={listing[5]}
      createdAt={listing[6]}
      bidCount={Number(listing[7])}
    />
  );
};

const MarketplacePage: NextPage = () => {
  const { address } = useAccount();
  const { listingCount, isLoadingCount } = useMarketplace();

  const count = Number(listingCount ?? 0n);

  return (
    <div className="flex flex-col items-center grow pt-10 px-4">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <BuildingStorefrontIcon className="h-8 w-8 text-accent" />
            <div>
              <h1 className="text-3xl font-bold">Marketplace</h1>
              <p className="text-base-content/70 mt-1">Anonymous information exchange</p>
            </div>
          </div>
          {address && (
            <Link href="/marketplace/create" className="btn btn-accent">
              <PlusIcon className="h-5 w-5" />
              Create Listing
            </Link>
          )}
        </div>

        {isLoadingCount ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : count === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-16">
              <BuildingStorefrontIcon className="h-16 w-16 text-base-content/20 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Listings Yet</h2>
              <p className="text-base-content/70 mb-6">
                Be the first to list encrypted information on the marketplace.
              </p>
              {address && (
                <Link href="/marketplace/create" className="btn btn-accent">
                  Create First Listing
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }, (_, i) => (
              <ListingLoader key={i} listingId={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;
