/**
 * Lit Protocol service (SDK v8 / Naga network).
 *
 * Encrypts the AES symmetric key under Lit Access Control Conditions that read
 * `DeadMansSwitch.isDeceased(address)` on-chain. Encryption is client-side BLS
 * (threshold) — anyone can encrypt; the conditions only gate decryption, which
 * requires a wallet-authenticated `authContext` (SIWE) verified by the node MPC
 * network. This preserves the MPC/threshold model the project is built around.
 *
 * IMPORTANT — network history:
 *   - Lit SDK v7 (`@lit-protocol/lit-node-client`) + the Datil network were
 *     sunset on 2026-02-25 and are no longer reachable. This module targets the
 *     v8 "official SDK" stack: `@lit-protocol/lit-client` + `@lit-protocol/networks`
 *     (Naga) + `@lit-protocol/auth`.
 *
 * IMPORTANT — chain requirement:
 *   Lit evaluates EVM access-control conditions against a fixed allow-list of
 *   public chains (see {@link LIT_SUPPORTED_CHAINS}). The local Hardhat chain
 *   (31337) is NOT in that list, so real Lit key-gating only works when the
 *   DeadMansSwitch is deployed to a supported network (e.g. Base Sepolia,
 *   Sepolia). The UI degrades gracefully on unsupported chains — see
 *   `VaultCreationForm`.
 */
import { ViemAccountAuthenticator, createAuthManager, storagePlugins } from "@lit-protocol/auth";
import { createLitClient } from "@lit-protocol/lit-client";
import { nagaDev } from "@lit-protocol/networks";
import type { EncryptSdkParams } from "@lit-protocol/types";
import type { LitAccessControlCondition, LitEncryptedKey } from "~~/types/zk-whistle";

type LitClient = Awaited<ReturnType<typeof createLitClient>>;

/**
 * Chains on which Lit can evaluate EVM access-control conditions.
 * Mirrors the `chain` enum shipped in `@lit-protocol/accs-schemas`
 * (LPACC_EVM_CONTRACT). Kept as a Set for O(1) membership checks.
 */
export const LIT_SUPPORTED_CHAINS = new Set<string>([
  "ethereum",
  "sepolia",
  "polygon",
  "amoy",
  "arbitrum",
  "arbitrumSepolia",
  "optimism",
  "base",
  "baseSepolia",
  "avalanche",
  "fuji",
  "bsc",
  "bscTestnet",
  "celo",
  "scroll",
  "scrollSepolia",
  "zksync",
  "mantle",
  "lisk",
  "yellowstone",
]);

/** Map a wagmi/EVM chain id to the Lit ACC chain name, or null if unsupported. */
export function litChainNameFromId(chainId?: number): string | null {
  switch (chainId) {
    case 1:
      return "ethereum";
    case 11155111:
      return "sepolia";
    case 137:
      return "polygon";
    case 80002:
      return "amoy";
    case 42161:
      return "arbitrum";
    case 421614:
      return "arbitrumSepolia";
    case 10:
      return "optimism";
    case 8453:
      return "base";
    case 84532:
      return "baseSepolia";
    case 43114:
      return "avalanche";
    case 43113:
      return "fuji";
    case 56:
      return "bsc";
    case 97:
      return "bscTestnet";
    case 534352:
      return "scroll";
    case 534351:
      return "scrollSepolia";
    default:
      return null;
  }
}

export function isLitSupportedChain(chain?: string | null): chain is string {
  return !!chain && LIT_SUPPORTED_CHAINS.has(chain);
}

// Module-level singletons.
let litClient: LitClient | null = null;

/**
 * Initialize and connect the Lit v8 client (Naga network).
 * Singleton to avoid duplicate handshakes.
 */
export async function initLitClient(): Promise<LitClient> {
  if (litClient) {
    return litClient;
  }
  litClient = await createLitClient({ network: nagaDev });
  return litClient;
}

/** Disconnect and clear the singleton. */
export async function disconnectLitClient(): Promise<void> {
  if (litClient) {
    litClient.disconnect();
    litClient = null;
  }
}

/**
 * Build the EVM-contract access-control condition for a Dead Man's Switch.
 * Condition: `DeadMansSwitch.isDeceased(userAddress) == true`.
 *
 * @param contractAddress Deployed DeadMansSwitch address (on `chain`).
 * @param userAddress The whistleblower's wallet address.
 * @param chain A Lit-supported chain name (see {@link LIT_SUPPORTED_CHAINS}).
 */
export function buildDeadMansSwitchACC(
  contractAddress: string,
  userAddress: string,
  chain: string,
): LitAccessControlCondition[] {
  return [
    {
      conditionType: "evmContract",
      contractAddress,
      chain,
      functionName: "isDeceased",
      functionParams: [userAddress],
      functionAbi: {
        name: "isDeceased",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "_user", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
      },
      returnValueTest: {
        key: "",
        comparator: "=",
        value: "true",
      },
    },
  ];
}

/**
 * Encrypt the raw AES key under the given access-control conditions.
 * Client-side BLS encryption — no wallet auth required at encrypt time.
 *
 * @param symmetricKey Raw AES key bytes to encrypt.
 * @param accessControlConditions EVM-contract conditions from {@link buildDeadMansSwitchACC}.
 * @param chain Lit-supported chain name the conditions read from.
 */
export async function encryptKeyWithLit(
  symmetricKey: Uint8Array,
  accessControlConditions: LitAccessControlCondition[],
  chain: string,
): Promise<LitEncryptedKey> {
  if (!isLitSupportedChain(chain)) {
    throw new Error(
      `Chain "${chain}" is not supported by Lit Protocol. Deploy DeadMansSwitch to a supported network (e.g. baseSepolia) — see README "Lit network requirement".`,
    );
  }
  const client = await initLitClient();

  // `chain` is a runtime-validated string-literal union in the SDK schema; cast
  // the structurally-identical domain conditions at this single boundary.
  const { ciphertext, dataToEncryptHash } = await client.encrypt({
    dataToEncrypt: symmetricKey,
    evmContractConditions: accessControlConditions,
    chain,
  } as unknown as EncryptSdkParams);

  return { ciphertext, dataToEncryptHash, chain };
}

/**
 * Build a wallet-authenticated EOA auth context for decryption.
 *
 * NOTE: This is the release-time (decrypt) path. It is implemented to the
 * documented v8 `AuthManager` pattern but has not been exercised against a live
 * Naga deployment in this prototype (no UI invokes decryption yet). Validate
 * end-to-end before relying on it in production.
 *
 * @param account A viem Account or WalletClient for the recipient/owner.
 */
export async function getDecryptAuthContext(account: unknown) {
  const client = await initLitClient();
  const authManager = createAuthManager({
    storage: storagePlugins.localStorage({ appName: "ZK-Whistle", networkName: "naga-dev" }),
  });

  // The exact `authConfig.resources` shape uses Lit resource-builder classes;
  // kept behind a localized boundary until the decrypt flow is wired + tested.
  return authManager.createEoaAuthContext({
    authConfig: {
      domain: typeof window !== "undefined" ? window.location.host : "zk-whistle",
      statement: "ZK-Whistle: authorize Dead Man's Switch decryption",
      expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
      resources: [["access-control-condition-decryption", "*"]],
    } as never,
    config: { account: account as never },
    litClient: client as never,
  });
}

/**
 * Decrypt the AES key from Lit. Requires the ACCs to currently evaluate true
 * (i.e. the Dead Man's Switch has triggered) and a valid `authContext`.
 *
 * @param encryptedKey Ciphertext + hash produced by {@link encryptKeyWithLit}.
 * @param accessControlConditions The same conditions used at encrypt time.
 * @param authContext From {@link getDecryptAuthContext}.
 * @param chain The Lit-supported chain name used at encrypt time.
 */
export async function decryptKeyFromLit(
  encryptedKey: LitEncryptedKey,
  accessControlConditions: LitAccessControlCondition[],
  authContext: unknown,
  chain: string,
): Promise<Uint8Array> {
  const client = await initLitClient();

  const { decryptedData } = await client.decrypt({
    ciphertext: encryptedKey.ciphertext,
    dataToEncryptHash: encryptedKey.dataToEncryptHash,
    evmContractConditions: accessControlConditions,
    chain,
    authContext,
  } as never);

  return new Uint8Array(decryptedData);
}

export { ViemAccountAuthenticator };
