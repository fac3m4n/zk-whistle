"use client";

import { useCallback, useState } from "react";
import { useMarketplace } from "~~/hooks/zk-whistle/useMarketplace";
import { notification } from "~~/utils/scaffold-eth";

type BidFormProps = {
  listingId: bigint;
  minimumBid: bigint;
};

/**
 * Form for placing a bid on a marketplace listing.
 */
export const BidForm = ({ listingId, minimumBid }: BidFormProps) => {
  const { placeBid, isWritePending } = useMarketplace();
  const [bidAmount, setBidAmount] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      notification.error("Please enter a valid bid amount");
      return;
    }

    try {
      await placeBid(listingId, bidAmount);
      notification.success("Bid placed successfully! Your funds are held in escrow.");
      setBidAmount("");
    } catch (err) {
      notification.error(`Bid failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [listingId, bidAmount, placeBid]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Place a Bid</h3>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Bid Amount (ETH)</span>
          <span className="label-text-alt">Min: {(Number(minimumBid) / 1e18).toFixed(4)} ETH</span>
        </label>
        <input
          type="number"
          step="0.001"
          min="0"
          className="input input-bordered w-full font-mono"
          placeholder="0.0"
          value={bidAmount}
          onChange={e => setBidAmount(e.target.value)}
        />
      </div>

      <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={isWritePending || !bidAmount}>
        {isWritePending ? <span className="loading loading-spinner loading-sm"></span> : "Place Bid"}
      </button>

      <p className="text-xs text-base-content/50">
        Your funds will be held in escrow until the whistleblower accepts your bid or you withdraw it.
      </p>
    </div>
  );
};
