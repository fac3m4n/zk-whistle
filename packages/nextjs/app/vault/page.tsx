"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { PlusIcon } from "@heroicons/react/24/outline";
import { HeartbeatManager } from "~~/components/zk-whistle/vault/HeartbeatManager";
import { VaultCard } from "~~/components/zk-whistle/vault/VaultCard";
import { useDeadMansSwitch } from "~~/hooks/zk-whistle/useDeadMansSwitch";

const VaultPage: NextPage = () => {
  const { address } = useAccount();
  const { switchDetails, isDeceased, isLoadingDetails } = useDeadMansSwitch(address);

  const isActive = switchDetails?.[5] ?? false;

  return (
    <div className="flex flex-col items-center grow pt-10 px-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">The Vault</h1>
            <p className="text-base-content/70 mt-1">Manage your Dead Man&apos;s Switch</p>
          </div>
          {address && !isActive && (
            <Link href="/vault/create" className="btn btn-primary">
              <PlusIcon className="h-5 w-5" />
              Create Vault
            </Link>
          )}
        </div>

        {!address ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-16">
              <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
              <p className="text-base-content/70">Connect a wallet to view or create your vault.</p>
            </div>
          </div>
        ) : isLoadingDetails ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : isActive ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HeartbeatManager />
            <VaultCard
              lastHeartbeat={Number(switchDetails?.[0] ?? 0n)}
              heartbeatInterval={Number(switchDetails?.[1] ?? 0n)}
              arweaveTxId={switchDetails?.[2] ?? ""}
              recipient={switchDetails?.[4] ?? ""}
              isActive={true}
              isDeceased={isDeceased ?? false}
            />
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-16">
              <h2 className="text-xl font-semibold mb-2">No Active Vault</h2>
              <p className="text-base-content/70 mb-6">
                Create a vault to set up your Dead Man&apos;s Switch. Encrypt files, store them permanently, and
                configure automatic release conditions.
              </p>
              <Link href="/vault/create" className="btn btn-primary">
                <PlusIcon className="h-5 w-5" />
                Create Your First Vault
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultPage;
