"use client";

import { useState } from "react";
import { AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { LockOpenIcon } from "@heroicons/react/24/outline";
import { CountdownTimer } from "~~/components/zk-whistle/common/CountdownTimer";
import { VaultRelease } from "~~/components/zk-whistle/vault/VaultRelease";
import { useDeadMansSwitch } from "~~/hooks/zk-whistle/useDeadMansSwitch";

/**
 * Recipient/public release page. Look up a switch owner's Dead Man's Switch and,
 * if it has triggered, recover the encrypted payload (Lit key release -> AES
 * decrypt -> download).
 */
const ReleasePage: NextPage = () => {
  const { address } = useAccount();
  const [target, setTarget] = useState("");

  const validTarget = isAddress(target) ? target : undefined;
  const { switchDetails, isDeceased, isLoadingDetails } = useDeadMansSwitch(validTarget);

  // getSwitchDetails tuple: [lastHeartbeat, interval, arweaveTxId, litRef, recipient, isActive]
  const lastHeartbeat = Number(switchDetails?.[0] ?? 0n);
  const interval = Number(switchDetails?.[1] ?? 0n);
  const arweaveTxId = switchDetails?.[2] ?? "";
  const recipient = switchDetails?.[4] ?? "";
  const isActive = switchDetails?.[5] ?? false;

  const hasRecord = lastHeartbeat > 0;
  const deadline = lastHeartbeat + interval;

  return (
    <div className="flex flex-col items-center grow pt-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LockOpenIcon className="h-7 w-7 text-primary" />
            Release a Vault
          </h1>
          <p className="text-base-content/70 mt-1">
            Enter a switch owner&apos;s address to check status and, once triggered, recover the encrypted payload.
          </p>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Switch Owner Address</span>
              </label>
              <AddressInput value={target} onChange={setTarget} placeholder="0x... (whistleblower address)" />
            </div>

            {!address && (
              <div className="alert">
                <span>Connect a wallet to authorize decryption when the switch has triggered.</span>
              </div>
            )}

            {validTarget && isLoadingDetails && (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            )}

            {validTarget && !isLoadingDetails && !hasRecord && (
              <div className="alert alert-info">
                <span>No vault is registered for this address.</span>
              </div>
            )}

            {validTarget && !isLoadingDetails && hasRecord && !isActive && !isDeceased && (
              <div className="alert alert-warning">
                <span>This switch was deactivated by its owner and cannot be released.</span>
              </div>
            )}

            {validTarget && !isLoadingDetails && hasRecord && isActive && !isDeceased && (
              <div className="space-y-4">
                <div className="alert">
                  <span>This switch is active and the owner is checking in. It is not releasable yet.</span>
                </div>
                <div className="flex flex-col items-center py-2">
                  <p className="text-sm text-base-content/70 mb-2">Time until release:</p>
                  <CountdownTimer targetTimestamp={deadline} />
                </div>
              </div>
            )}

            {validTarget && !isLoadingDetails && hasRecord && isDeceased && (
              <VaultRelease arweaveTxId={arweaveTxId} isDeceased={true} recipient={recipient} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleasePage;
