# **Advanced Decentralized Architecture for Confidential Whistleblowing: Moving Beyond Trusted Execution Environments to Multi-Party Computation and Zero-Knowledge Provenance**

## **1\. Introduction**

The protection of whistleblowers stands as a critical pillar of transparent governance and corporate accountability. Individuals who risk their livelihoods and safety to expose misconduct—be it state surveillance, corporate fraud, or environmental negligence—often face severe retaliation. The concept of a "Dead Man's Switch" (DMS) serves as a vital insurance policy for these actors: a mechanism that automatically releases encrypted information to the public or specific recipients should the whistleblower become incapacitated or detained. Historically, such mechanisms relied on trusted human intermediaries or centralized digital services, both of which introduce single points of failure and trust assumptions vulnerable to coercion, legal subpoena, or technical compromise.

The initial iteration of the "Dead Man's NFT" project explored the use of blockchain technology to decentralize the trigger mechanism, utilizing Trusted Execution Environments (TEEs)—specifically the iExec framework utilizing Intel SGX—to secure the decryption keys. While TEEs offer a significant improvement over standard server-side encryption by isolating code execution at the hardware level, they rely on a hardware root of trust. Recent research and security exploits (e.g., Foreshadow, SGAxe) have demonstrated that TEEs are not impervious to side-channel attacks, and reliance on a specific hardware vendor (Intel) contradicts the ethos of a maximally decentralized, censorship-resistant system.

This research report proposes a fundamental architectural paradigm shift. It moves away from hardware-enforced isolation (TEE) toward cryptographically enforced security via Multi-Party Computation (MPC) and Threshold Cryptography. Specifically, it investigates and integrates the **Lit Protocol** as a decentralized key management network to handle the conditional release of data. Furthermore, addressing the critical challenge of verifying the credibility of an anonymous source without compromising their identity, this report incorporates **Reclaim Protocol** and **zkTLS** (Zero-Knowledge Transport Layer Security). This combination allows for a "provenance-first" approach, where a whistleblower can cryptographically prove their access to specific information or their employment at a specific entity using zero-knowledge proofs, establishing reputation and social connection while maintaining absolute anonymity.

The following sections detail the theoretical limitations of TEEs, explore the mechanics of MPC and Threshold Signature Schemes (TSS), evaluate specific protocols like Lit and Sarcophagus, and present a comprehensive redesign of the system architecture that integrates these technologies with permanent storage solutions like Arweave and anonymous payment rails via ERC-5564 stealth addresses.

## **2\. Theoretical Framework: The Shift from Hardware to Math**

### **2.1 Limitations of Trusted Execution Environments (TEEs) in Adversarial Contexts**

The reliance on TEEs in the original architecture was predicated on the assumption that hardware enclaves could provide a "black box" where decryption keys could be stored and used without the host machine operator having access. Technologies like Intel SGX (Software Guard Extensions) allow for the creation of encrypted memory regions (enclaves) that are isolated from the operating system and hypervisor.

However, the threat model for a high-value whistleblower involves nation-state level adversaries who may possess the resources to exploit complex hardware vulnerabilities.

- **Side-Channel Vulnerabilities:** Research indicates that TEEs are susceptible to transient execution attacks and cache-timing attacks.1 If an adversary has physical access to the server hosting the TEE (a plausible scenario for cloud providers subject to government warrants), they may be able to extract the sealed keys.
- **Centralized Trust Root:** TEEs require trusting the hardware manufacturer (e.g., Intel) to manage the attestation keys correctly. If the manufacturer's master key is compromised or if they are compelled to produce a backdoor, the security guarantees of the entire network collapse.2
- **Liveness and Availability:** TEE nodes are often singular or require specific hardware configurations. If the specific TEE nodes tasked with holding a whistleblower's key go offline or are censored, the dead man's switch may fail to trigger.1

### **2.2 Multi-Party Computation (MPC) and Threshold Cryptography**

To mitigate the risks associated with TEEs, this research pivots to Threshold Cryptography. In a threshold cryptosystem, a private key is never generated or stored in a single location. Instead, it is split into ![][image1] shares using schemes like Shamir's Secret Sharing.3

The fundamental property of a ![][image2] threshold scheme is that any subset of ![][image3] participants (nodes) can collaborate to perform a cryptographic operation (such as signing a transaction or decrypting a file), but any subset smaller than ![][image3] gains zero information about the key.4

- **Distributed Trust:** The security of the key is not tied to a single hardware enclave but to the distributed consensus of the network. An adversary would need to simultaneously compromise ![][image3] distinct nodes, often run by different operators in different jurisdictions, to reconstruct the key.6
- **Non-Interactive Properties:** Modern implementations allows for non-interactive distributed key generation (DKG) and signing, reducing the communication overhead and latency typically associated with older MPC protocols.8
- **Resilience:** The system is fault-tolerant. If ![][image4] nodes are taken offline (e.g., via DDoS or legal seizure), the remaining nodes can still execute the switch, ensuring the "unstoppable" nature of the data release.4

### **2.3 Zero-Knowledge Provenance and zkTLS**

A recurring issue in anonymous whistleblowing is the "noise" problem. Platforms like SecureDrop often receive large volumes of fabricated or irrelevant information. Journalists require a method to verify the _provenance_ of the data—that it truly originates from a credible source—without knowing _who_ the source is.

**zkTLS (Zero-Knowledge Transport Layer Security)** emerges as the solution. Standard TLS (HTTPS) encrypts data between a client and a server, preventing third-party observation. zkTLS allows the client to generate a zero-knowledge proof that attests to the content of the secure session.9

- **Mechanism:** A user can log into a corporate portal or government database. The zkTLS protocol witnesses the encrypted data transfer. The user then generates a ZK proof asserting, "I accessed this specific URL, and the server responded with a session token belonging to the 'Administrator' group," without revealing the session token or their username.10
- **Reclaim Protocol Implementation:** Reclaim Protocol implements this by using an HTTP proxy to oversee the handshake and data transmission. The proxy (witness) sees encrypted traffic and attests to its validity, while the user generates a proof of the decrypted content locally. This separates the _fact_ of the data from the _identity_ of the user.12

## **3\. Comparative Analysis of Dead Man's Switch Alternatives**

The research identifies and evaluates three primary alternatives to the iExec TEE implementation for the Dead Man's Switch mechanism: Lit Protocol, Sarcophagus, and a custom Threshold Network implementation.

### **3.1 Alternative 1: Lit Protocol (Programmable Key Management)**

Lit Protocol functions as a decentralized key management network that utilizes MPC and Threshold Signature Schemes (TSS). It introduces the concept of "Programmable Key Pairs" (PKPs) and "Lit Actions".6

**Architecture:**

- **Nodes:** The network consists of nodes that hold key shares. Unlike pure MPC networks, Lit nodes utilize TEEs (specifically AMD SEV-SNP) as a secondary layer of defense to accelerate signing operations, but the core security guarantee is cryptographic (threshold) rather than purely hardware-based.15
- **Access Control Conditions (ACCs):** Lit allows data to be encrypted such that it can only be decrypted if specific on-chain conditions are met. For a dead man's switch, the condition would be checking a smart contract state variable (e.g., isDeceased \== true).17
- **Lit Actions:** These are immutable JavaScript functions stored on IPFS. A Lit Action can be programmed to check the "heartbeat" status on a blockchain. If the user has not updated their heartbeat within the defined interval, the Lit Action authorizes the nodes to sign the decryption request, releasing the key to the recipient.14

**Suitability:** Lit Protocol is highly suitable because it abstracts the complexity of MPC into a developer-friendly SDK. The ability to write logic (Lit Actions) means the "trigger" conditions for the dead man's switch can be complex (e.g., "User hasn't checked in AND a specific oracle confirms a news event").16

### **3.2 Alternative 2: Sarcophagus Protocol (Dedicated Dead Man's Switch)**

Sarcophagus is a decentralized application built specifically for the dead man's switch use case, utilizing Ethereum for logic and Arweave for permanent storage.20

**Architecture:**

- **Embalmer:** The user who creates the "Sarcophagus" (the hidden file). They encrypt the file and set a "resurrection time".21
- **Archaeologist:** Third-party node operators who stake tokens ($SARCO) to guarantee their service. They are responsible for "unwrapping" (decrypting) the outer layer of encryption when the time comes.21
- **Double Encryption:** The file is encrypted twice: first with the recipient's public key (inner layer), and second with the Archaeologist's public key (outer layer). The Archaeologist can only remove the outer layer, ensuring they cannot read the payload themselves.20
- **Trigger:** If the Embalmer fails to "re-wrap" (check-in) before the resurrection time, the Archaeologist decrypts the outer layer, publishing the inner encrypted file to Arweave, which the recipient can then decrypt.20

**Trade-offs:** Sarcophagus offers a more "out-of-the-box" solution for this specific problem compared to Lit. However, it requires active management of the $SARCO token and relies on an economic incentive model (paying Archaeologists) rather than a purely programmable infrastructure. If the user runs out of funds to pay the Archaeologist, the switch may fail or the data may be lost.22 Lit Protocol's capacity credit model or the ability to pay once for a long-duration Lit Action may offer better long-term stability for a "set and forget" system.23

### **3.3 Alternative 3: Generic Threshold Networks (NuCypher/Threshold)**

The Threshold Network (a merger of NuCypher and Keep Network) offers "Proxy Re-Encryption" (PRE). In this model, the whistleblower encrypts data with a public key. The network nodes hold "re-encryption keys" split via Shamir's Secret Sharing.24

**Mechanism:** When the release condition is met, the network nodes transform the ciphertext (encrypted for the whistleblower) into ciphertext encrypted for the recipient, without ever decrypting the underlying data.24

**Suitability:**

While mathematically elegant, PRE networks often require the recipient to be known and have a public key _at the time of encryption_. A dead man's switch for whistleblowing often needs to release data to the _public_ (or an unknown future journalist). Lit Protocol's ability to provision a decryption key upon a condition match is more flexible for public releases than PRE, which is strictly point-to-point.

### **3.4 Decision: Lit Protocol as the Core Infrastructure**

Based on the analysis, **Lit Protocol** is selected as the primary replacement for iExec. Its combination of MPC for key security and Lit Actions for programmable trigger logic provides the necessary flexibility to build a custom "Unstoppable Leak" application. Sarcophagus serves as a conceptual reference for the use of Arweave (permanent storage) but lacks the general-purpose programmability required to integrate deeply with reputation systems like Reclaim.

## **4\. Integration of Reputation and Social Connection**

### **4.1 The Credibility Gap in Anonymous Reporting**

A significant hurdle for journalists receiving anonymous tips is verification. A drop containing "proof of tax fraud" is worthless if the source cannot be verified as an insider. However, proving identity (e.g., sending a photo of an ID badge) destroys anonymity.

### **4.2 Reclaim Protocol: The zkTLS Solution**

Reclaim Protocol allows users to generate proofs of data from any HTTPS website. For a whistleblower app, this enables "Persona Verification" without "Identity Revelation".9

**Implementation Strategy:**

1. **Provider Creation:** The dApp developer creates a "Provider" definition in Reclaim for relevant platforms (e.g., Slack, Microsoft Teams, Gusto, Government portals). This definition tells the Reclaim Witness what data to look for in the HTTPS response (e.g., the string "Organization: NSA" in a profile header).26
2. **Client-Side Proof Generation:** When the whistleblower sets up their switch, they verify their credentials locally. The Reclaim SDK opens a secure WebView. The user logs into their organization's portal.
3. **Witness and Redaction:** The Reclaim Witness observes the encrypted traffic. The user's device decrypts the response, redacts sensitive info (like their specific name or employee ID), and leaves only the target claim (e.g., "Employment Status: Active").
4. **Zero-Knowledge Proof:** A ZKP is generated asserting that the redacted data came from the authenticated session with the target URL.28
5. **Attachment:** This proof is attached as metadata to the encrypted dead man's switch payload. A journalist receiving the released files sees a cryptographic guarantee: "Source verified as active employee of".13

### **4.3 Complementary Protocol: ZK-Email**

While Reclaim handles web-session verification, **ZK-Email** 29 offers verification for email-based credentials.

- **Mechanism:** ZK-Email verifies the DKIM (DomainKeys Identified Mail) signature inherent in modern emails.
- **Use Case:** A whistleblower can forward an email from their boss to the dApp. The dApp generates a ZK proof that "This user possesses an email signed by ceo@corp.com with the subject line Project X Coverup," without revealing the user's own email address or the full body of the email if not desired.31
- **Integration:** This serves as a secondary layer of reputation. A leak containing both a Reclaim proof (web portal access) and a ZK-Email proof (direct correspondence) carries immense credibility.33

## **5\. Redesigned System Architecture**

The proposed architecture replaces the TEE-centric design with a modular stack comprising four layers: **Client**, **Logic/State**, **Encryption/Key Management**, and **Storage**.

### **5.1 Architectural Components**

#### **5.1.1 Client Layer (The Whistleblower Interface)**

A web-based dApp (React/Next.js) serves as the entry point. To ensure operational security, it should ideally be accessed via Tor or a VPN.

- **Local Encryption:** All file encryption happens client-side using the Web Crypto API or Lit SDK before data ever leaves the browser. This ensures that not even the dApp operators see plaintext.34
- **Identity Management:** The user connects with a fresh Ethereum wallet (burner wallet).

#### **5.1.2 Logic Layer (Heartbeat Smart Contract)**

A simplified smart contract deployed on a cost-effective EVM chain (e.g., Polygon, Arbitrum) manages the "liveness" state.

- **State Variable:** lastHeartbeat (uint256).
- **Function:** checkIn() updates lastHeartbeat to block.timestamp.
- **Function:** isDeceased() returns true if block.timestamp \> lastHeartbeat \+ interval.36
- **Optimization:** ERC-5564 Stealth Addresses are integrated here. If the release triggers a reward payment, the smart contract directs funds to a stealth address derived from the whistleblower's keys, breaking the on-chain link between the source and the funds.37

#### **5.1.3 Encryption & Key Management Layer (Lit Protocol)**

This layer replaces the iExec TEE.

- **Encryption:** The user generates a symmetric key (S) to encrypt the file (F).
- **Condition:** The user encrypts key (S) using the Lit Network. The Access Control Condition (ACC) is defined as: "Smart Contract at 0xABC... must return isDeceased() \== true OR the signer must be 0xUser... (the user themselves)".17
- **Lit Action:** A Javascript function deployed on IPFS governs the release. It checks the smart contract state. If the "dead" condition is met, the Lit Nodes collaboratively sign the release of key (S) to the requestor.14

#### **5.1.4 Storage Layer (Arweave \+ IPFS)**

- **Arweave:** Used for the encrypted payload. Arweave's "permaweb" property ensures that once the data is uploaded, it cannot be censored or deleted by the host, government, or the whistleblower themselves (under duress).20
- **IPFS:** Used for mutable metadata, such as the Lit Action code or the Reclaim reputation proofs, which might need to be referenced dynamically.40

### **5.2 System Workflow**

1. **Setup:** The whistleblower uploads the file. The client generates a symmetric key, encrypts the file, and uploads the ciphertext to Arweave.
2. **Locking:** The symmetric key is encrypted by the Lit Network nodes. The ACC is set to the Heartbeat Contract.
3. **Attestation:** The user runs the Reclaim Protocol widget. They log into their relevant portal. A ZK proof of employment/access is generated and attached to the Arweave transaction metadata.
4. **Routine:** The whistleblower sends a checkIn() transaction to the blockchain every ![][image5] days.
5. **Trigger:** The whistleblower goes missing. The interval expires.
6. **Discovery:** A journalist (or an automated bot) queries the contract, sees the interval has passed. They request decryption from the Lit Network.
7. **Release:** Lit nodes verify the isDeceased state on-chain. They reconstruct the decryption key shares. The journalist receives the key, decrypts the file, and verifies the Reclaim proof to confirm the source's credibility.

## **6\. Implementation Strategy and Security Analysis**

### **6.1 Cryptographic Implementation Details**

**Lit Protocol Integration:**

The implementation utilizes the LitJsSdk. The core function saveEncryptionKey takes the accessControlConditions.

JavaScript

const accessControlConditions \=,  
 chain: "polygon",  
 returnValueTest: {  
 key: "",  
 comparator: "=",  
 value: "true",  
 },  
 },  
\];

This JSON structure tells the Lit nodes to execute a call to the Polygon blockchain. Only if the smart contract returns "true" will the nodes provision the decryption shares.17

**Reclaim Proof Verification:** The dApp must include a verification viewer. When the file is unlocked, the ZK proof JSON is passed to the Reclaim SDK's verifyProof function. This function checks the cryptographic signatures of the Witness nodes and ensures the proof parameters (e.g., URL matched twitter.com/settings) align with the expected reputation claim.28

### **6.2 Threat Modeling and Mitigation**

| Threat Vector              | Description                                                           | Mitigation Strategy                                                                                                                                                                 |
| :------------------------- | :-------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Liveness Oracle Attack** | Adversary blocks user's internet to force a release (false positive). | **Duress Channel:** Include a "Kill Switch" in the smart contract that burns the key permanently if a specific signature is broadcast.                                              |
| **Collusion of Lit Nodes** | Lit nodes conspire to reconstruct the key before the deadline.        | **Threshold Security:** Lit requires 2/3rds of nodes to collude. As the network is decentralized, this probability is cryptographically negligible.6                                |
| **Sybil/Spam Reports**     | Adversaries flood the system with fake leaks.                         | **Reclaim/ZK-Email:** Journalists can filter leaks based on "Verified" status (e.g., only open files from users with \>5 year old Twitter accounts or verified corporate emails).30 |
| **Metadata Leakage**       | On-chain check-ins reveal user's activity patterns.                   | **Stealth Addresses & Relayers:** Use checkIn() via a relayer service to obfuscate the IP address and disconnect the wallet from the user's identity.42                             |
| **Storage Censorship**     | Storage provider deletes the encrypted file.                          | **Arweave:** The endowment model ensures data permanence. The data is replicated across the decentralized web and cannot be unilaterally deleted.39                                 |

### **6.3 Anonymous Rewarding via ERC-5564**

The original research highlighted the difficulty of rewarding anonymous sources. This proposal integrates **ERC-5564 (Stealth Addresses)**.

- **Mechanism:** The whistleblower publishes a "Stealth Meta-Address" along with their encrypted file.
- **Payment:** If the leak is valuable, the journalist uses the Meta-Address to derive a unique, one-time payment address on the blockchain.
- **Access:** Only the whistleblower (holding the viewing/spending keys) can locate and access the funds at this new address. To the outside world, the payment looks like a transfer to a random, unrelated address.42

## **7\. Future Work and Conclusion**

### **7.1 Scalability and Interoperability**

Future iterations of this system could explore "Cross-Chain" signaling. Lit Protocol's PKPs can sign transactions on multiple chains (Ethereum, Solana, Cosmos). A dead man's switch could be configured to trigger actions across chains—for example, releasing documents on Arweave while simultaneously moving funds from a Bitcoin wallet using a Wrapped Key.43

### **7.2 AI Integration**

Integrating AI agents into the verification loop offers promise. An LLM running inside a TEE (or utilizing zkTLS to verify LLM queries) could perform a preliminary analysis of the leaked documents to tag them with summaries, without exposing the documents to a human. Reclaim Protocol is already exploring AI to automate the creation of providers for new websites.26

### **7.3 Conclusion**

This updated research report presents a comprehensive architectural evolution of the decentralized whistleblowing platform. By replacing the brittle, hardware-dependent security of iExec TEEs with the resilient, cryptographic security of Lit Protocol's MPC network, the system achieves a higher degree of decentralization and censorship resistance. The integration of Reclaim Protocol and zkTLS fills a critical void in previous designs by enabling trustless reputation and provenance verification. Coupled with Arweave for permanent storage and Stealth Addresses for anonymous rewarding, this architecture represents a robust, end-to-end solution for the "Unstoppable Leak"—a tool essential for truth in an age of surveillance.

### ---

**Data Tables**

**Table 1: Architectural Comparison: TEE vs. MPC vs. Dedicated Protocol**

| Feature                 | iExec TEE (Original Thesis)              | Lit Protocol (Proposed)           | Sarcophagus (Alternative)           |
| :---------------------- | :--------------------------------------- | :-------------------------------- | :---------------------------------- |
| **Core Trust Anchor**   | Hardware (Intel SGX)                     | **Math (Threshold Cryptography)** | Economic (Incentivized Nodes)       |
| **Key Storage**         | Sealed in Enclave                        | **Split across Network**          | Split among Archaeologists          |
| **Failure Mode**        | Hardware vulnerability / Vendor backdoor | **Collusion of \>2/3 nodes**      | User stops paying rent / Node churn |
| **Programmability**     | Low (Requires enclave rebuild)           | **High (Lit Actions \- JS)**      | Medium (Smart Contract Parameters)  |
| **Cost Model**          | Pay per Task                             | **Capacity Credits / Gas**        | Ongoing rental fees ($SARCO)        |
| **Identity/Reputation** | None (Anonymous)                         | **Reclaim (zkTLS) \+ ZK-Email**   | None (Anonymous)                    |

**Table 2: Comparison of Provenance Technologies**

| Technology                   | Verification Target     | Use Case in Whistleblowing                                                               | Source |
| :--------------------------- | :---------------------- | :--------------------------------------------------------------------------------------- | :----- |
| **Reclaim Protocol (zkTLS)** | HTTPS Sessions (Web2)   | Proving access to internal employee portals, banking dashboards, social media ownership. | 9      |
| **ZK-Email**                 | DKIM Signatures (Email) | Proving receipt of emails from specific domains (e.g., government.gov) or individuals.   | 30     |
| **Traditional KYC**          | ID Documents            | **Unsuitable** (Doxxes the user).                                                        | N/A    |

This report synthesizes data from sources 28 to propose a viable, secure architectural path forward.

#### **Works cited**

1. TEE vs. MPC vs. ZK: What's the Best for Confidential Computing?, accessed February 6, 2026, [https://phala.com/posts/tee-vs-mpc-vs-zk-whats-the-best-for-confidential-computing](https://phala.com/posts/tee-vs-mpc-vs-zk-whats-the-best-for-confidential-computing)
2. The Privacy Stack Wars: ZK vs FHE vs TEE vs MPC \- BlockEden.xyz, accessed February 6, 2026, [https://blockeden.xyz/blog/2026/01/27/privacy-infrastructure-zk-fhe-tee-mpc-comparison-benchmarks/](https://blockeden.xyz/blog/2026/01/27/privacy-infrastructure-zk-fhe-tee-mpc-comparison-benchmarks/)
3. A location privacy protection method based on blockchain and, accessed February 6, 2026, [https://www.researchgate.net/publication/392401778_A_location_privacy_protection_method_based_on_blockchain_and_threshold_cryptography](https://www.researchgate.net/publication/392401778_A_location_privacy_protection_method_based_on_blockchain_and_threshold_cryptography)
4. Threshold cryptosystem \- Wikipedia, accessed February 6, 2026, [https://en.wikipedia.org/wiki/Threshold_cryptosystem](https://en.wikipedia.org/wiki/Threshold_cryptosystem)
5. Multi-Party Threshold Cryptography | CSRC, accessed February 6, 2026, [https://csrc.nist.gov/projects/threshold-cryptography](https://csrc.nist.gov/projects/threshold-cryptography)
6. What is Lit Protocol? Core Infrastructure for Programmable Key, accessed February 6, 2026, [https://www.mexc.com/learn/article/what-is-lit-protocol-core-infrastructure-for-programmable-key-management-in-web3/1](https://www.mexc.com/learn/article/what-is-lit-protocol-core-infrastructure-for-programmable-key-management-in-web3/1)
7. Thetacrypt: A Distributed Service for Threshold Cryptography \- arXiv, accessed February 6, 2026, [https://arxiv.org/html/2502.03247v1](https://arxiv.org/html/2502.03247v1)
8. MPC Wallets: A Complete Technical Guide (2025) \- Stackup, accessed February 6, 2026, [https://www.stackup.fi/resources/mpc-wallets-a-complete-technical-guide](https://www.stackup.fi/resources/mpc-wallets-a-complete-technical-guide)
9. 'Cross-platform reputation' comes to Humanity Protocol with zkTLS, accessed February 6, 2026, [https://www.biometricupdate.com/202508/cross-platform-reputation-comes-to-humanity-protocol-with-zktls](https://www.biometricupdate.com/202508/cross-platform-reputation-comes-to-humanity-protocol-with-zktls)
10. The zk in zkTLS \- Reclaim Protocol, accessed February 6, 2026, [https://blog.reclaimprotocol.org/posts/zk-in-zktls](https://blog.reclaimprotocol.org/posts/zk-in-zktls)
11. zkTLS: A Secure Bridge Between the Traditional Web and the, accessed February 6, 2026, [https://blog.impossible.finance/zktls/](https://blog.impossible.finance/zktls/)
12. Opensourcing Reclaim Protocol, accessed February 6, 2026, [https://blog.reclaimprotocol.org/posts/open-source-reclaim](https://blog.reclaimprotocol.org/posts/open-source-reclaim)
13. How does the data flow happen \- Reclaim Protocol, accessed February 6, 2026, [https://blog.reclaimprotocol.org/posts/data-flow](https://blog.reclaimprotocol.org/posts/data-flow)
14. Our Investment in Lit Protocol | by RRE Ventures, accessed February 6, 2026, [https://blog.rre.com/our-investment-in-lit-protocol-7906067a9406](https://blog.rre.com/our-investment-in-lit-protocol-7906067a9406)
15. Safeheron MPC Node: World's First Key Management Privatization, accessed February 6, 2026, [https://safeheron.com/blog/safeheron-mpc-node/](https://safeheron.com/blog/safeheron-mpc-node/)
16. How Lit Protocol Coordinates Decentralized Key Management with, accessed February 6, 2026, [https://blog.arbitrum.io/how-lit-protocol-coordinates-decentralized-key-management-with-stylus/](https://blog.arbitrum.io/how-lit-protocol-coordinates-decentralized-key-management-with-stylus/)
17. Lit Protocol: A Developer's Guide to Decentralized Access Control, accessed February 6, 2026, [https://medium.com/@BizthonOfficial/lit-protocol-a-developers-guide-to-decentralized-access-control-for-token-gated-content-2654ce0f1281](https://medium.com/@BizthonOfficial/lit-protocol-a-developers-guide-to-decentralized-access-control-for-token-gated-content-2654ce0f1281)
18. Lit Protocol Use Cases \- Notion, accessed February 6, 2026, [https://litprotocol.notion.site/Lit-Protocol-Use-Cases-a94916becdc0411f848c3095722c7864](https://litprotocol.notion.site/Lit-Protocol-Use-Cases-a94916becdc0411f848c3095722c7864)
19. Execute Javascript \- Lit Protocol Documentation, accessed February 6, 2026, [https://litprotocol.mintlify.app/sdk/auth-context-consumption/execute-js](https://litprotocol.mintlify.app/sdk/auth-context-consumption/execute-js)
20. In-depth Analysis of Sarcophagus: The Eternal Dead Man's Switch, accessed February 6, 2026, [https://medium.com/@perma_dao/in-depth-analysis-of-sarcophagus-the-eternal-dead-mans-switch-e8979b81208c](https://medium.com/@perma_dao/in-depth-analysis-of-sarcophagus-the-eternal-dead-mans-switch-e8979b81208c)
21. A Dead Man's Switch | by Miguel Saldana | Sarcophagus Community, accessed February 6, 2026, [https://medium.com/sarcophagus-community/sarcophagus-a-dead-mans-switch-92e70de66554](https://medium.com/sarcophagus-community/sarcophagus-a-dead-mans-switch-92e70de66554)
22. A Decentralized Dead Man's Switch | Hacker News, accessed February 6, 2026, [https://news.ycombinator.com/item?id=26427964](https://news.ycombinator.com/item?id=26427964)
23. Paying for Usage of Lit \- Lit Protocol, accessed February 6, 2026, [https://developer.litprotocol.com/paying-for-lit/overview](https://developer.litprotocol.com/paying-for-lit/overview)
24. A Threshold Proxy Re-Encryption Scheme for Secure IoT Data, accessed February 6, 2026, [https://www.mdpi.com/2079-9292/10/19/2359](https://www.mdpi.com/2079-9292/10/19/2359)
25. Threshold cryptography \- ResearchGate, accessed February 6, 2026, [https://www.researchgate.net/publication/229782661_Threshold_cryptography](https://www.researchgate.net/publication/229782661_Threshold_cryptography)
26. AI to scale zkTLS \- Reclaim Protocol, accessed February 6, 2026, [https://blog.reclaimprotocol.org/posts/zktls-ai](https://blog.reclaimprotocol.org/posts/zktls-ai)
27. How to Create a Custom Reclaim zkTLS Provider \- XION, accessed February 6, 2026, [https://docs.burnt.com/xion/developers/mobile-app-development/how-to-create-a-custom-reclaim-zktls-provider](https://docs.burnt.com/xion/developers/mobile-app-development/how-to-create-a-custom-reclaim-zktls-provider)
28. Is Reclaim Secure?, accessed February 6, 2026, [https://blog.reclaimprotocol.org/posts/security-faq](https://blog.reclaimprotocol.org/posts/security-faq)
29. ZK Email \- GitHub, accessed February 6, 2026, [https://github.com/zkemail](https://github.com/zkemail)
30. ZK Email | PSE, accessed February 6, 2026, [https://pse.dev/projects/zk-email](https://pse.dev/projects/zk-email)
31. Zero-Knowledge Proofs | ZK Email \- Introduction, accessed February 6, 2026, [https://docs.zk.email/architecture/zk-proofs](https://docs.zk.email/architecture/zk-proofs)
32. On-chain Integration | ZK Email Architecture, accessed February 6, 2026, [https://docs.zk.email/architecture/on-chain](https://docs.zk.email/architecture/on-chain)
33. Boost your Unique Humanity score with ZK Email Stamp through, accessed February 6, 2026, [https://passport.human.tech/blog/boost-your-unique-humanity-score-with-zk-email-stamp-through-amazon-and-uber-receipts](https://passport.human.tech/blog/boost-your-unique-humanity-score-with-zk-email-stamp-through-amazon-and-uber-receipts)
34. Dead Man's Switch | Hacker News, accessed February 6, 2026, [https://news.ycombinator.com/item?id=7547080](https://news.ycombinator.com/item?id=7547080)
35. 1\. Intro \- Lit Protocol, accessed February 6, 2026, [https://developer.litprotocol.com/learninglab/intro-to-lit/intro](https://developer.litprotocol.com/learninglab/intro-to-lit/intro)
36. Deadman Switch \- ETHGlobal, accessed February 6, 2026, [https://ethglobal.com/showcase/deadman-switch-s87or](https://ethglobal.com/showcase/deadman-switch-s87or)
37. ERC-5564 \- Stealth Addresses, accessed February 6, 2026, [https://nerolation.github.io/stealth-utils/](https://nerolation.github.io/stealth-utils/)
38. ERC-5564: Stealth Addresses \- Ethereum Improvement Proposals, accessed February 6, 2026, [https://eips.ethereum.org/EIPS/eip-5564](https://eips.ethereum.org/EIPS/eip-5564)
39. yellow-paper.pdf \- Arweave, accessed February 6, 2026, [https://www.arweave.org/yellow-paper.pdf](https://www.arweave.org/yellow-paper.pdf)
40. Build on Arweave, accessed February 6, 2026, [https://www.arweave.org/build](https://www.arweave.org/build)
41. Encrypt with a wallet signature using Lit Protocol, accessed February 6, 2026, [https://docs.request.network/advanced/request-network-sdk/sdk-guides/encryption-and-decryption/handle-encryption-with-a-web3-wallet](https://docs.request.network/advanced/request-network-sdk/sdk-guides/encryption-and-decryption/handle-encryption-with-a-web3-wallet)
42. Private Transactions on Ethereum using Stealth Addresses (ERC, accessed February 6, 2026, [https://www.quicknode.com/guides/ethereum-development/wallets/how-to-use-stealth-addresses-on-ethereum-eip-5564](https://www.quicknode.com/guides/ethereum-development/wallets/how-to-use-stealth-addresses-on-ethereum-eip-5564)
43. Overview | Lit Protocol, accessed February 6, 2026, [https://developer.litprotocol.com/user-wallets/wrapped-keys/overview](https://developer.litprotocol.com/user-wallets/wrapped-keys/overview)
44. s10207-024-00913-0.pdf
