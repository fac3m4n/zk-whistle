"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { VaultCreationForm } from "~~/components/zk-whistle/vault/VaultCreationForm";

const CreateVaultPage: NextPage = () => {
  return (
    <div className="flex flex-col items-center grow pt-10 px-4">
      <div className="w-full max-w-2xl">
        <Link href="/vault" className="btn btn-ghost btn-sm mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Vault
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create New Vault</h1>
          <p className="text-base-content/70 mt-1">Encrypt a file and register a Dead Man&apos;s Switch on-chain.</p>
        </div>

        <VaultCreationForm />

        <div className="mt-8 bg-base-200 rounded-2xl p-6">
          <h3 className="font-semibold mb-3">How it works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-base-content/70">
            <li>Your file is encrypted client-side using AES-256-GCM. No plaintext leaves your browser.</li>
            <li>The encrypted payload is uploaded to Arweave for permanent, censorship-resistant storage.</li>
            <li>
              The decryption key is encrypted by the Lit Protocol network, gated by your on-chain heartbeat status.
            </li>
            <li>You must check in periodically. If you stop checking in, the switch triggers.</li>
            <li>When triggered, the Lit network releases the decryption key to the designated recipient.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default CreateVaultPage;
