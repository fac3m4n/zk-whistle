import { expect } from "chai";
import { ethers } from "hardhat";
import { MockReclaim, WhistleblowerRegistry } from "../typechain-types";

/** Build a Reclaim on-chain Proof struct (shape matches transformForOnchain output). */
function buildProof(identifier: string, owner: string) {
  return {
    claimInfo: { provider: "http", parameters: "{}", context: "" },
    signedClaim: {
      claim: { identifier, owner, timestampS: 0, epoch: 1 },
      signatures: ["0x1234"],
    },
  };
}

describe("WhistleblowerRegistry", function () {
  let registry: WhistleblowerRegistry;
  let user1: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let user2: Awaited<ReturnType<typeof ethers.getSigners>>[0];

  const PROOF_HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("reclaim_proof_json_1"));
  const PROOF_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("reclaim_proof_json_2"));
  const STEALTH_META = "st:eth:0x1234abcd...viewing_key...spending_key";

  // user1 (signer 0) is also the deployer and therefore the registry owner/verifier.
  beforeEach(async () => {
    [user1, user2] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("WhistleblowerRegistry");
    // autoVerifyOnSubmit enabled (dev/demo default)
    registry = (await factory.deploy(true)) as WhistleblowerRegistry;
    await registry.waitForDeployment();
  });

  describe("submitProofHash", function () {
    it("Should store a proof hash", async function () {
      await registry.submitProofHash(PROOF_HASH_1);
      const hashes = await registry.getProofHashes(user1.address);
      expect(hashes).to.have.lengthOf(1);
      expect(hashes[0]).to.equal(PROOF_HASH_1);
    });

    it("Should emit ProofSubmitted event", async function () {
      await expect(registry.submitProofHash(PROOF_HASH_1))
        .to.emit(registry, "ProofSubmitted")
        .withArgs(user1.address, PROOF_HASH_1, await getBlockTimestamp());
    });

    it("Should auto-verify on first proof submission", async function () {
      expect(await registry.isVerified(user1.address)).to.be.false;
      await registry.submitProofHash(PROOF_HASH_1);
      expect(await registry.isVerified(user1.address)).to.be.true;
    });

    it("Should emit VerificationUpdated on first proof", async function () {
      await expect(registry.submitProofHash(PROOF_HASH_1))
        .to.emit(registry, "VerificationUpdated")
        .withArgs(user1.address, true);
    });

    it("Should allow multiple proofs from the same user", async function () {
      await registry.submitProofHash(PROOF_HASH_1);
      await registry.submitProofHash(PROOF_HASH_2);
      const hashes = await registry.getProofHashes(user1.address);
      expect(hashes).to.have.lengthOf(2);
    });

    it("Should reject zero proof hash", async function () {
      await expect(registry.submitProofHash(ethers.ZeroHash)).to.be.revertedWith("Invalid proof hash");
    });

    it("Should reject duplicate proof hash", async function () {
      await registry.submitProofHash(PROOF_HASH_1);
      await expect(registry.submitProofHash(PROOF_HASH_1)).to.be.revertedWith("Proof already submitted");
    });

    it("Should reject same proof hash from different users", async function () {
      await registry.submitProofHash(PROOF_HASH_1);
      await expect(registry.connect(user2).submitProofHash(PROOF_HASH_1)).to.be.revertedWith("Proof already submitted");
    });
  });

  describe("setStealthMetaAddress", function () {
    it("Should store a stealth meta-address", async function () {
      await registry.setStealthMetaAddress(STEALTH_META);
      expect(await registry.getStealthMetaAddress(user1.address)).to.equal(STEALTH_META);
    });

    it("Should emit StealthMetaAddressUpdated event", async function () {
      await expect(registry.setStealthMetaAddress(STEALTH_META))
        .to.emit(registry, "StealthMetaAddressUpdated")
        .withArgs(user1.address);
    });

    it("Should reject empty meta-address", async function () {
      await expect(registry.setStealthMetaAddress("")).to.be.revertedWith("Empty meta-address");
    });

    it("Should allow updating meta-address", async function () {
      await registry.setStealthMetaAddress(STEALTH_META);
      const newMeta = "st:eth:0xnewkey";
      await registry.setStealthMetaAddress(newMeta);
      expect(await registry.getStealthMetaAddress(user1.address)).to.equal(newMeta);
    });
  });

  describe("getUserProfile", function () {
    it("Should return full profile", async function () {
      await registry.submitProofHash(PROOF_HASH_1);
      await registry.setStealthMetaAddress(STEALTH_META);

      const profile = await registry.getUserProfile(user1.address);
      expect(profile.proofHashes).to.have.lengthOf(1);
      expect(profile.verified).to.be.true;
      expect(profile.registeredAt).to.be.greaterThan(0);
      expect(profile.stealthMetaAddress).to.equal(STEALTH_META);
    });

    it("Should return empty profile for unknown user", async function () {
      const profile = await registry.getUserProfile(user2.address);
      expect(profile.proofHashes).to.have.lengthOf(0);
      expect(profile.verified).to.be.false;
      expect(profile.registeredAt).to.equal(0);
    });
  });

  describe("getProofCount", function () {
    it("Should return correct count", async function () {
      expect(await registry.getProofCount(user1.address)).to.equal(0);
      await registry.submitProofHash(PROOF_HASH_1);
      expect(await registry.getProofCount(user1.address)).to.equal(1);
      await registry.submitProofHash(PROOF_HASH_2);
      expect(await registry.getProofCount(user1.address)).to.equal(2);
    });
  });

  describe("getRegisteredUserCount", function () {
    it("Should track registered users", async function () {
      expect(await registry.getRegisteredUserCount()).to.equal(0);
      await registry.submitProofHash(PROOF_HASH_1);
      expect(await registry.getRegisteredUserCount()).to.equal(1);
      await registry.connect(user2).submitProofHash(PROOF_HASH_2);
      expect(await registry.getRegisteredUserCount()).to.equal(2);
    });

    it("Should not double-count same user", async function () {
      await registry.submitProofHash(PROOF_HASH_1);
      await registry.submitProofHash(PROOF_HASH_2);
      expect(await registry.getRegisteredUserCount()).to.equal(1);
    });
  });

  describe("attestVerification (owner/verifier path)", function () {
    it("Should let the owner revoke a verified user", async function () {
      await registry.connect(user2).submitProofHash(PROOF_HASH_2);
      expect(await registry.isVerified(user2.address)).to.be.true;

      await registry.attestVerification(user2.address, false);
      expect(await registry.isVerified(user2.address)).to.be.false;
    });

    it("Should let the owner verify a user when auto-verify is off", async function () {
      await registry.setAutoVerifyOnSubmit(false);
      await registry.connect(user2).submitProofHash(PROOF_HASH_2);
      expect(await registry.isVerified(user2.address)).to.be.false;

      await expect(registry.attestVerification(user2.address, true))
        .to.emit(registry, "VerificationUpdated")
        .withArgs(user2.address, true);
      expect(await registry.isVerified(user2.address)).to.be.true;
    });

    it("Should reject attestation from a non-owner", async function () {
      await registry.connect(user2).submitProofHash(PROOF_HASH_2);
      await expect(registry.connect(user2).attestVerification(user2.address, false)).to.be.revertedWithCustomError(
        registry,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should reject attesting an unregistered user", async function () {
      await expect(registry.attestVerification(user2.address, true)).to.be.revertedWith("User not registered");
    });
  });

  describe("autoVerifyOnSubmit toggle", function () {
    it("Should not auto-verify when disabled", async function () {
      await registry.setAutoVerifyOnSubmit(false);
      await registry.connect(user2).submitProofHash(PROOF_HASH_2);
      expect(await registry.isVerified(user2.address)).to.be.false;
      expect(await registry.getProofCount(user2.address)).to.equal(1);
    });

    it("Should reject toggle from a non-owner", async function () {
      await expect(registry.connect(user2).setAutoVerifyOnSubmit(false)).to.be.revertedWithCustomError(
        registry,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("setReclaimVerifier", function () {
    let mock: MockReclaim;

    beforeEach(async () => {
      const mockFactory = await ethers.getContractFactory("MockReclaim");
      mock = (await mockFactory.deploy()) as MockReclaim;
      await mock.waitForDeployment();
    });

    it("Should let the owner set the verifier", async function () {
      const addr = await mock.getAddress();
      await expect(registry.setReclaimVerifier(addr)).to.emit(registry, "ReclaimVerifierUpdated").withArgs(addr);
      expect(await registry.reclaimVerifier()).to.equal(addr);
    });

    it("Should reject setting the verifier from a non-owner", async function () {
      await expect(registry.connect(user2).setReclaimVerifier(await mock.getAddress())).to.be.revertedWithCustomError(
        registry,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("submitVerifiedProof (on-chain verification)", function () {
    let mock: MockReclaim;
    const IDENTIFIER = ethers.keccak256(ethers.toUtf8Bytes("onchain_proof_1"));

    beforeEach(async () => {
      const mockFactory = await ethers.getContractFactory("MockReclaim");
      mock = (await mockFactory.deploy()) as MockReclaim;
      await mock.waitForDeployment();
      // Auto-verify OFF to prove the cryptographic path is independent.
      await registry.setAutoVerifyOnSubmit(false);
      await registry.setReclaimVerifier(await mock.getAddress());
    });

    it("Should reject when no verifier is configured", async function () {
      const freshFactory = await ethers.getContractFactory("WhistleblowerRegistry");
      const fresh = (await freshFactory.deploy(false)) as WhistleblowerRegistry;
      await fresh.waitForDeployment();
      await expect(fresh.submitVerifiedProof(buildProof(IDENTIFIER, user1.address))).to.be.revertedWith(
        "Verifier not configured",
      );
    });

    it("Should verify the proof owner and store the identifier", async function () {
      await registry.submitVerifiedProof(buildProof(IDENTIFIER, user1.address));
      expect(await registry.isVerified(user1.address)).to.be.true;
      const hashes = await registry.getProofHashes(user1.address);
      expect(hashes).to.deep.equal([IDENTIFIER]);
    });

    it("Should emit ProofVerifiedOnChain and VerificationUpdated", async function () {
      await expect(registry.submitVerifiedProof(buildProof(IDENTIFIER, user1.address)))
        .to.emit(registry, "ProofVerifiedOnChain")
        .withArgs(user1.address, IDENTIFIER)
        .and.to.emit(registry, "VerificationUpdated")
        .withArgs(user1.address, true);
    });

    it("Should accrue verification to the proof owner, not the relayer", async function () {
      // user1 relays a proof issued to user2.
      await registry.connect(user1).submitVerifiedProof(buildProof(IDENTIFIER, user2.address));
      expect(await registry.isVerified(user2.address)).to.be.true;
      expect(await registry.isVerified(user1.address)).to.be.false;
    });

    it("Should revert when the verifier rejects the proof", async function () {
      await mock.setShouldPass(false);
      await expect(registry.submitVerifiedProof(buildProof(IDENTIFIER, user1.address))).to.be.revertedWith(
        "MockReclaim: invalid proof",
      );
      // Nothing recorded on failure.
      expect(await registry.isVerified(user1.address)).to.be.false;
      expect(await registry.proofHashExists(IDENTIFIER)).to.be.false;
    });

    it("Should reject a zero identifier", async function () {
      await expect(registry.submitVerifiedProof(buildProof(ethers.ZeroHash, user1.address))).to.be.revertedWith(
        "Invalid proof identifier",
      );
    });

    it("Should reject a zero owner", async function () {
      await expect(registry.submitVerifiedProof(buildProof(IDENTIFIER, ethers.ZeroAddress))).to.be.revertedWith(
        "Invalid proof owner",
      );
    });

    it("Should reject a duplicate proof identifier", async function () {
      await registry.submitVerifiedProof(buildProof(IDENTIFIER, user1.address));
      await expect(registry.submitVerifiedProof(buildProof(IDENTIFIER, user2.address))).to.be.revertedWith(
        "Proof already submitted",
      );
    });
  });

  // Helper to get current block timestamp (approximate for event matching)
  async function getBlockTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    // Return next block's likely timestamp (current + 1 is typical for test)
    return block!.timestamp + 1;
  }
});
