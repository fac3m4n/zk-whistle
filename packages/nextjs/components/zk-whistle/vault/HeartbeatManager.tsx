"use client";

import { useCallback } from "react";
import { useAccount } from "wagmi";
import { CountdownTimer } from "~~/components/zk-whistle/common/CountdownTimer";
import { StatusIndicator } from "~~/components/zk-whistle/common/StatusIndicator";
import { useDeadMansSwitch } from "~~/hooks/zk-whistle/useDeadMansSwitch";
import { notification } from "~~/utils/scaffold-eth";

/**
 * Heartbeat management component.
 * Displays the countdown timer and provides the check-in button.
 */
export const HeartbeatManager = () => {
  const { address } = useAccount();
  const { switchDetails, isDeceased, checkIn, isWritePending, isLoadingDetails } = useDeadMansSwitch(address);

  const handleCheckIn = useCallback(async () => {
    try {
      await checkIn();
      notification.success("Heartbeat updated successfully!");
    } catch (err) {
      notification.error(`Check-in failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [checkIn]);

  if (!address) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <p className="text-base-content/70">Connect your wallet to manage your heartbeat.</p>
        </div>
      </div>
    );
  }

  if (isLoadingDetails) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  // switchDetails is a tuple: [lastHeartbeat, heartbeatInterval, arweaveTxId, litAccessControlId, recipient, isActive]
  const isActive = switchDetails?.[5] ?? false;
  const lastHeartbeat = Number(switchDetails?.[0] ?? 0n);
  const interval = Number(switchDetails?.[1] ?? 0n);

  if (!isActive) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <h2 className="card-title">No Active Switch</h2>
          <p className="text-base-content/70">Create a vault to activate your Dead Man&apos;s Switch.</p>
        </div>
      </div>
    );
  }

  const deadline = lastHeartbeat + interval;
  const status = isDeceased ? "triggered" : "active";

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body items-center text-center">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="card-title">Dead Man&apos;s Switch</h2>
          <StatusIndicator status={status} />
        </div>

        {isDeceased ? (
          <div className="alert alert-error">
            <span>Your switch has been triggered. Encrypted data is now accessible.</span>
          </div>
        ) : (
          <>
            <p className="text-base-content/70 mb-2">Time until trigger:</p>
            <CountdownTimer targetTimestamp={deadline} />
            <div className="card-actions mt-6">
              <button className="btn btn-primary btn-lg" onClick={handleCheckIn} disabled={isWritePending}>
                {isWritePending ? <span className="loading loading-spinner loading-sm"></span> : "Check In"}
              </button>
            </div>
            <p className="text-xs text-base-content/50 mt-2">
              Interval: {Math.floor(interval / 86400)}d {Math.floor((interval % 86400) / 3600)}h
            </p>
          </>
        )}
      </div>
    </div>
  );
};
