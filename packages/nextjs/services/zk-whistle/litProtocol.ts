/**
 * Lit Protocol service for managing encryption conditions.
 * Encrypts the AES symmetric key under Lit Access Control Conditions
 * that check the DeadMansSwitch.isDeceased() on-chain state.
 *
 * Uses Lit Protocol SDK v7 (latest stable) with the Datil-dev network.
 */
import { LIT_ABILITY, LIT_NETWORK } from "@lit-protocol/constants";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { LitAccessControlCondition, LitEncryptedKey } from "~~/types/zk-whistle";

// Module-level singleton for the Lit client
let litClient: LitNodeClient | null = null;

/**
 * Initialize and connect the Lit Protocol client.
 * Uses a singleton pattern to avoid creating multiple connections.
 */
export async function initLitClient(): Promise<LitNodeClient> {
  if (litClient?.ready) {
    return litClient;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  litClient = new LitNodeClient({
    litNetwork: LIT_NETWORK.NagaDev,
    debug: false,
  } as any);

  await litClient.connect();
  return litClient;
}

/**
 * Disconnect the Lit client (cleanup).
 */
export async function disconnectLitClient(): Promise<void> {
  if (litClient) {
    await litClient.disconnect();
    litClient = null;
  }
}

/**
 * Build the Access Control Conditions for a Dead Man's Switch.
 * The condition checks: DeadMansSwitch.isDeceased(userAddress) == true
 * OR the signer is the user themselves (so they can always decrypt their own data).
 *
 * @param contractAddress - Deployed DeadMansSwitch contract address
 * @param userAddress - The whistleblower's wallet address
 * @param chain - The chain name (e.g. "ethereum", "hardhat")
 */
export function buildDeadMansSwitchACC(
  contractAddress: string,
  userAddress: string,
  chain: string,
): LitAccessControlCondition[] {
  return [
    // Condition 1: isDeceased returns true
    {
      contractAddress,
      standardContractType: "",
      chain,
      method: "isDeceased",
      parameters: [userAddress],
      returnValueTest: {
        key: "",
        comparator: "=",
        value: "true",
      },
    },
  ];
}

/**
 * Encrypt a symmetric key using Lit Protocol's Access Control Conditions.
 * The key can only be decrypted when the ACC conditions are met (heartbeat expired).
 *
 * @param symmetricKey - The raw AES key bytes to encrypt
 * @param accessControlConditions - The Lit ACCs to gate decryption
 */
export async function encryptKeyWithLit(
  symmetricKey: Uint8Array,
  accessControlConditions: LitAccessControlCondition[],
): Promise<LitEncryptedKey> {
  const client = await initLitClient();

  const { ciphertext, dataToEncryptHash } = await client.encrypt({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accessControlConditions: accessControlConditions as any,
    dataToEncrypt: symmetricKey,
  });

  return {
    ciphertext,
    dataToEncryptHash,
  };
}

/**
 * Decrypt a symmetric key from Lit Protocol.
 * Requires that the Access Control Conditions are currently satisfied
 * (i.e., the Dead Man's Switch has triggered).
 *
 * @param encryptedKey - The encrypted key data from Lit
 * @param accessControlConditions - The same ACCs used during encryption
 * @param sessionSigs - Session signatures from the user's wallet
 */
export async function decryptKeyFromLit(
  encryptedKey: LitEncryptedKey,
  accessControlConditions: LitAccessControlCondition[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionSigs: Record<string, any>,
): Promise<Uint8Array> {
  const client = await initLitClient();

  const { decryptedData } = await client.decrypt({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accessControlConditions: accessControlConditions as any,
    ciphertext: encryptedKey.ciphertext,
    dataToEncryptHash: encryptedKey.dataToEncryptHash,
    sessionSigs,
    chain: "ethereum",
  });

  return new Uint8Array(decryptedData);
}

/**
 * Get session signatures for Lit Protocol using the user's wallet.
 * This authenticates the user with the Lit network.
 *
 * @param walletAddress - The user's wallet address
 * @param signMessage - Function to sign a message with the wallet
 */
export async function getLitSessionSigs(
  walletAddress: string,
  signMessage: (message: string) => Promise<string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const client = await initLitClient();

  const sessionSigs = await client.getSessionSigs({
    chain: "ethereum",
    resourceAbilityRequests: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resource: { resource: "*", resourcePrefix: "lit-accesscontrolcondition" } as any,
        ability: LIT_ABILITY.AccessControlConditionDecryption,
      },
    ],
    authNeededCallback: async params => {
      const message = params.uri || "Sign to authenticate with Lit Protocol";
      const signature = await signMessage(message);
      return {
        sig: signature,
        derivedVia: "web3.eth.personal.sign",
        signedMessage: message,
        address: walletAddress,
      };
    },
  });

  return sessionSigs;
}

export { LIT_NETWORK, LIT_ABILITY };
