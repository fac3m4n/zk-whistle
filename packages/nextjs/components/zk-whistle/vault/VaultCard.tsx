"use client";

import { Address } from "@scaffold-ui/components";
import { CountdownTimer } from "~~/components/zk-whistle/common/CountdownTimer";
import { StatusIndicator } from "~~/components/zk-whistle/common/StatusIndicator";

type VaultCardProps = {
  lastHeartbeat: number;
  heartbeatInterval: number;
  arweaveTxId: string;
  recipient: string;
  isActive: boolean;
  isDeceased: boolean;
};

/**
 * Card component displaying vault/switch status and details.
 */
export const VaultCard = ({
  lastHeartbeat,
  heartbeatInterval,
  arweaveTxId,
  recipient,
  isActive,
  isDeceased,
}: VaultCardProps) => {
  const deadline = lastHeartbeat + heartbeatInterval;
  const status = !isActive ? "deactivated" : isDeceased ? "triggered" : "active";
  const isPublicRelease = recipient === "0x0000000000000000000000000000000000000000";

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h3 className="card-title text-lg">Vault Details</h3>
          <StatusIndicator status={status} />
        </div>

        <div className="divider my-2"></div>

        {/* Countdown */}
        {isActive && !isDeceased && (
          <div className="flex flex-col items-center py-4">
            <p className="text-sm text-base-content/70 mb-2">Time until release:</p>
            <CountdownTimer targetTimestamp={deadline} />
          </div>
        )}

        {/* Details */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-base-content/70">Interval:</span>
            <span className="font-mono">
              {Math.floor(heartbeatInterval / 86400)}d {Math.floor((heartbeatInterval % 86400) / 3600)}h
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-base-content/70">Last Check-in:</span>
            <span className="font-mono">{new Date(lastHeartbeat * 1000).toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-base-content/70">Recipient:</span>
            {isPublicRelease ? (
              <span className="badge badge-info badge-sm">Public Release</span>
            ) : (
              <Address address={recipient} />
            )}
          </div>

          <div className="flex justify-between">
            <span className="text-base-content/70">Arweave TX:</span>
            <span className="font-mono text-xs truncate max-w-[200px]">{arweaveTxId}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
