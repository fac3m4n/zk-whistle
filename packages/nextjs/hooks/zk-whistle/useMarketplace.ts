"use client";

import { parseEther } from "viem";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/**
 * React hook for interacting with the Marketplace smart contract.
 * Wraps Scaffold-ETH 2 contract hooks for typed marketplace operations.
 */
export function useMarketplace() {
  // -------------------------------------------------------
  // Write operations
  // -------------------------------------------------------

  const { writeContractAsync: writeMarketplaceAsync, isPending: isWritePending } =
    useScaffoldWriteContract("Marketplace");

  const createListing = async (
    descriptionHash: string,
    arweaveTxId: string,
    minimumBid: string, // ETH amount as string
    isVerified: boolean,
  ) => {
    return writeMarketplaceAsync({
      functionName: "createListing",
      args: [descriptionHash, arweaveTxId, parseEther(minimumBid), isVerified],
    });
  };

  const placeBid = async (listingId: bigint, bidAmount: string) => {
    return writeMarketplaceAsync({
      functionName: "placeBid",
      args: [listingId],
      value: parseEther(bidAmount),
    });
  };

  const acceptBid = async (listingId: bigint, bidIndex: bigint, stealthAddress: string) => {
    return writeMarketplaceAsync({
      functionName: "acceptBid",
      args: [listingId, bidIndex, stealthAddress],
    });
  };

  const withdrawBid = async (listingId: bigint, bidIndex: bigint) => {
    return writeMarketplaceAsync({
      functionName: "withdrawBid",
      args: [listingId, bidIndex],
    });
  };

  const deactivateListing = async (listingId: bigint) => {
    return writeMarketplaceAsync({
      functionName: "deactivateListing",
      args: [listingId],
    });
  };

  // -------------------------------------------------------
  // Read operations
  // -------------------------------------------------------

  const { data: listingCount, isLoading: isLoadingCount } = useScaffoldReadContract({
    contractName: "Marketplace",
    functionName: "listingCount",
  });

  return {
    // Write
    createListing,
    placeBid,
    acceptBid,
    withdrawBid,
    deactivateListing,
    isWritePending,

    // Read
    listingCount,
    isLoadingCount,
  };
}

/**
 * Hook to read a specific listing's details.
 */
export function useMarketplaceListing(listingId: bigint | undefined) {
  const { data: listing, isLoading } = useScaffoldReadContract({
    contractName: "Marketplace",
    functionName: "getListing",
    args: [listingId],
  });

  const { data: bidCount } = useScaffoldReadContract({
    contractName: "Marketplace",
    functionName: "listings",
    args: [listingId],
  });

  return {
    listing,
    isLoading,
    bidCount,
  };
}

/**
 * Hook to read a specific bid's details.
 */
export function useMarketplaceBid(listingId: bigint | undefined, bidIndex: bigint | undefined) {
  const { data: bid, isLoading } = useScaffoldReadContract({
    contractName: "Marketplace",
    functionName: "getBid",
    args: [listingId, bidIndex],
  });

  return { bid, isLoading };
}
