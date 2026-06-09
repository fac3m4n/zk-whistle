import { expect } from "chai";
import { ethers } from "hardhat";
import { DeadMansSwitch } from "../typechain-types";

/** Advance the chain clock by `seconds` and mine a block. */
async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("DeadMansSwitch", function () {
  let dms: DeadMansSwitch;
  let owner: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let recipient: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let other: Awaited<ReturnType<typeof ethers.getSigners>>[0];

  const ONE_DAY = 86400;
  const ARWEAVE_TX = "arweave_tx_payload_123";
  const LIT_ID = "lit_acc_hash_456";

  beforeEach(async () => {
    [owner, recipient, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("DeadMansSwitch");
    dms = (await factory.deploy()) as DeadMansSwitch;
    await dms.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should start with zero switch owners", async function () {
      expect(await dms.getSwitchOwnerCount()).to.equal(0);
    });
  });

  describe("createSwitch", function () {
    it("Should store the switch details", async function () {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);

      const details = await dms.getSwitchDetails(owner.address);
      expect(details.heartbeatInterval).to.equal(ONE_DAY);
      expect(details.arweaveTxId).to.equal(ARWEAVE_TX);
      expect(details.litAccessControlId).to.equal(LIT_ID);
      expect(details.recipient).to.equal(recipient.address);
      expect(details.isActive).to.be.true;
      expect(details.lastHeartbeat).to.be.greaterThan(0);
    });

    it("Should emit SwitchCreated and HeartbeatUpdated", async function () {
      await expect(dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address))
        .to.emit(dms, "SwitchCreated")
        .withArgs(owner.address, ONE_DAY, ARWEAVE_TX, recipient.address)
        .and.to.emit(dms, "HeartbeatUpdated");
    });

    it("Should track the switch owner once", async function () {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
      await dms.connect(other).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
      expect(await dms.getSwitchOwnerCount()).to.equal(2);
    });

    it("Should allow a public release (zero recipient)", async function () {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, ethers.ZeroAddress);
      const details = await dms.getSwitchDetails(owner.address);
      expect(details.recipient).to.equal(ethers.ZeroAddress);
    });

    it("Should reject a zero interval", async function () {
      await expect(dms.connect(owner).createSwitch(0, ARWEAVE_TX, LIT_ID, recipient.address)).to.be.revertedWith(
        "Interval must be > 0",
      );
    });

    it("Should reject an empty Arweave TX ID", async function () {
      await expect(dms.connect(owner).createSwitch(ONE_DAY, "", LIT_ID, recipient.address)).to.be.revertedWith(
        "Arweave TX ID required",
      );
    });

    it("Should reject creating a second active switch", async function () {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
      await expect(dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address)).to.be.revertedWith(
        "Switch already active",
      );
    });

    it("Should not double-count an owner who re-creates after deactivating", async function () {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
      await dms.connect(owner).deactivateSwitch();
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
      expect(await dms.getSwitchOwnerCount()).to.equal(1);
    });
  });

  describe("checkIn", function () {
    beforeEach(async () => {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
    });

    it("Should advance the heartbeat timestamp", async function () {
      const before = (await dms.getSwitchDetails(owner.address)).lastHeartbeat;
      await increaseTime(3600);
      await dms.connect(owner).checkIn();
      const after = (await dms.getSwitchDetails(owner.address)).lastHeartbeat;
      expect(after).to.be.greaterThan(before);
    });

    it("Should reset a near-expired switch so it is not deceased", async function () {
      await increaseTime(ONE_DAY - 10);
      await dms.connect(owner).checkIn();
      await increaseTime(10);
      expect(await dms.isDeceased(owner.address)).to.be.false;
    });

    it("Should emit HeartbeatUpdated", async function () {
      await expect(dms.connect(owner).checkIn()).to.emit(dms, "HeartbeatUpdated");
    });

    it("Should reject check-in without an active switch", async function () {
      await expect(dms.connect(other).checkIn()).to.be.revertedWith("No active switch");
    });
  });

  describe("isDeceased", function () {
    beforeEach(async () => {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
    });

    it("Should be false immediately after creation", async function () {
      expect(await dms.isDeceased(owner.address)).to.be.false;
    });

    it("Should be false before the interval elapses", async function () {
      await increaseTime(ONE_DAY - 100);
      expect(await dms.isDeceased(owner.address)).to.be.false;
    });

    it("Should be true once the interval elapses", async function () {
      await increaseTime(ONE_DAY + 1);
      expect(await dms.isDeceased(owner.address)).to.be.true;
    });

    it("Should be false after deactivation even if expired", async function () {
      await dms.connect(owner).deactivateSwitch();
      await increaseTime(ONE_DAY + 1);
      expect(await dms.isDeceased(owner.address)).to.be.false;
    });

    it("Should be false for an address with no switch", async function () {
      expect(await dms.isDeceased(other.address)).to.be.false;
    });
  });

  describe("timeUntilTrigger", function () {
    beforeEach(async () => {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
    });

    it("Should be close to the interval right after creation", async function () {
      const remaining = await dms.timeUntilTrigger(owner.address);
      expect(remaining).to.be.greaterThan(ONE_DAY - 10);
      expect(remaining).to.be.lessThanOrEqual(ONE_DAY);
    });

    it("Should be zero after the interval elapses", async function () {
      await increaseTime(ONE_DAY + 1);
      expect(await dms.timeUntilTrigger(owner.address)).to.equal(0);
    });

    it("Should be zero for an inactive switch", async function () {
      await dms.connect(owner).deactivateSwitch();
      expect(await dms.timeUntilTrigger(owner.address)).to.equal(0);
    });
  });

  describe("deactivateSwitch", function () {
    beforeEach(async () => {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
    });

    it("Should set the switch inactive", async function () {
      await dms.connect(owner).deactivateSwitch();
      const details = await dms.getSwitchDetails(owner.address);
      expect(details.isActive).to.be.false;
    });

    it("Should emit SwitchDeactivated", async function () {
      await expect(dms.connect(owner).deactivateSwitch()).to.emit(dms, "SwitchDeactivated").withArgs(owner.address);
    });

    it("Should reject deactivation without an active switch", async function () {
      await expect(dms.connect(other).deactivateSwitch()).to.be.revertedWith("No active switch");
    });
  });

  describe("updateSwitchMetadata", function () {
    beforeEach(async () => {
      await dms.connect(owner).createSwitch(ONE_DAY, ARWEAVE_TX, LIT_ID, recipient.address);
    });

    it("Should update both references", async function () {
      await dms.connect(owner).updateSwitchMetadata("new_arweave_tx", "new_lit_id");
      const details = await dms.getSwitchDetails(owner.address);
      expect(details.arweaveTxId).to.equal("new_arweave_tx");
      expect(details.litAccessControlId).to.equal("new_lit_id");
    });

    it("Should keep the existing value when an empty string is passed", async function () {
      await dms.connect(owner).updateSwitchMetadata("", "only_lit_changed");
      const details = await dms.getSwitchDetails(owner.address);
      expect(details.arweaveTxId).to.equal(ARWEAVE_TX);
      expect(details.litAccessControlId).to.equal("only_lit_changed");
    });

    it("Should emit SwitchUpdated", async function () {
      await expect(dms.connect(owner).updateSwitchMetadata("new_arweave_tx", "new_lit_id"))
        .to.emit(dms, "SwitchUpdated")
        .withArgs(owner.address, "new_arweave_tx", "new_lit_id");
    });

    it("Should reject updates without an active switch", async function () {
      await expect(dms.connect(other).updateSwitchMetadata("x", "y")).to.be.revertedWith("No active switch");
    });
  });
});
