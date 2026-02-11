import { expect } from "chai";
import { ethers } from "hardhat";
import { WhistleblowerRegistry } from "../typechain-types";

describe("WhistleblowerRegistry", function () {
  let registry: WhistleblowerRegistry;
  let user1: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let user2: Awaited<ReturnType<typeof ethers.getSigners>>[0];

  const PROOF_HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("reclaim_proof_json_1"));
  const PROOF_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("reclaim_proof_json_2"));
  const STEALTH_META = "st:eth:0x1234abcd...viewing_key...spending_key";

  beforeEach(async () => {
    [user1, user2] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("WhistleblowerRegistry");
    registry = (await factory.deploy()) as WhistleblowerRegistry;
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

  // Helper to get current block timestamp (approximate for event matching)
  async function getBlockTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    // Return next block's likely timestamp (current + 1 is typical for test)
    return block!.timestamp + 1;
  }
});
