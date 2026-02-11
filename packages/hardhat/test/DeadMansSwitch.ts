import { expect } from "chai";
import { ethers, network } from "hardhat";
import { DeadMansSwitch } from "../typechain-types";

describe("DeadMansSwitch", function () {
  let deadMansSwitch: DeadMansSwitch;
  let owner: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let recipient: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let other: Awaited<ReturnType<typeof ethers.getSigners>>[0];

  const INTERVAL = 86400; // 1 day in seconds
  const ARWEAVE_TX = "arweave_tx_abc123";
  const LIT_ACC_ID = "lit_acc_xyz789";

  beforeEach(async () => {
    [owner, recipient, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("DeadMansSwitch");
    deadMansSwitch = (await factory.deploy()) as DeadMansSwitch;
    await deadMansSwitch.waitForDeployment();
  });

  describe("createSwitch", function () {
    it("Should create a switch with correct parameters", async function () {
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);

      const details = await deadMansSwitch.getSwitchDetails(owner.address);
      expect(details.heartbeatInterval).to.equal(INTERVAL);
      expect(details.arweaveTxId).to.equal(ARWEAVE_TX);
      expect(details.litAccessControlId).to.equal(LIT_ACC_ID);
      expect(details.recipient).to.equal(recipient.address);
      expect(details.isActive).to.be.true;
    });

    it("Should emit SwitchCreated and HeartbeatUpdated events", async function () {
      await expect(deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address))
        .to.emit(deadMansSwitch, "SwitchCreated")
        .withArgs(owner.address, INTERVAL, ARWEAVE_TX, recipient.address);
    });

    it("Should reject zero interval", async function () {
      await expect(deadMansSwitch.createSwitch(0, ARWEAVE_TX, LIT_ACC_ID, recipient.address)).to.be.revertedWith(
        "Interval must be > 0",
      );
    });

    it("Should reject empty Arweave TX ID", async function () {
      await expect(deadMansSwitch.createSwitch(INTERVAL, "", LIT_ACC_ID, recipient.address)).to.be.revertedWith(
        "Arweave TX ID required",
      );
    });

    it("Should reject creating a second switch while one is active", async function () {
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
      await expect(deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address)).to.be.revertedWith(
        "Switch already active",
      );
    });

    it("Should allow address(0) as recipient for public release", async function () {
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, ethers.ZeroAddress);
      const details = await deadMansSwitch.getSwitchDetails(owner.address);
      expect(details.recipient).to.equal(ethers.ZeroAddress);
    });
  });

  describe("checkIn", function () {
    beforeEach(async () => {
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
    });

    it("Should update lastHeartbeat timestamp", async function () {
      // Advance time
      await network.provider.send("evm_increaseTime", [3600]);
      await network.provider.send("evm_mine");

      await deadMansSwitch.checkIn();
      const details = await deadMansSwitch.getSwitchDetails(owner.address);
      const block = await ethers.provider.getBlock("latest");
      expect(details.lastHeartbeat).to.equal(block!.timestamp);
    });

    it("Should emit HeartbeatUpdated event", async function () {
      await expect(deadMansSwitch.checkIn()).to.emit(deadMansSwitch, "HeartbeatUpdated");
    });

    it("Should reject checkIn from user without active switch", async function () {
      await expect(deadMansSwitch.connect(other).checkIn()).to.be.revertedWith("No active switch");
    });
  });

  describe("isDeceased", function () {
    beforeEach(async () => {
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
    });

    it("Should return false immediately after creation", async function () {
      expect(await deadMansSwitch.isDeceased(owner.address)).to.be.false;
    });

    it("Should return false before interval expires", async function () {
      await network.provider.send("evm_increaseTime", [INTERVAL - 100]);
      await network.provider.send("evm_mine");
      expect(await deadMansSwitch.isDeceased(owner.address)).to.be.false;
    });

    it("Should return true after interval expires", async function () {
      await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
      await network.provider.send("evm_mine");
      expect(await deadMansSwitch.isDeceased(owner.address)).to.be.true;
    });

    it("Should return false after checkIn resets the timer", async function () {
      await network.provider.send("evm_increaseTime", [INTERVAL - 100]);
      await network.provider.send("evm_mine");
      await deadMansSwitch.checkIn();

      await network.provider.send("evm_increaseTime", [100]);
      await network.provider.send("evm_mine");
      expect(await deadMansSwitch.isDeceased(owner.address)).to.be.false;
    });

    it("Should return false for deactivated switch", async function () {
      await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
      await network.provider.send("evm_mine");
      await deadMansSwitch.deactivateSwitch();
      expect(await deadMansSwitch.isDeceased(owner.address)).to.be.false;
    });

    it("Should return false for non-existent user", async function () {
      expect(await deadMansSwitch.isDeceased(other.address)).to.be.false;
    });
  });

  describe("deactivateSwitch", function () {
    beforeEach(async () => {
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
    });

    it("Should deactivate the switch", async function () {
      await deadMansSwitch.deactivateSwitch();
      const details = await deadMansSwitch.getSwitchDetails(owner.address);
      expect(details.isActive).to.be.false;
    });

    it("Should emit SwitchDeactivated event", async function () {
      await expect(deadMansSwitch.deactivateSwitch())
        .to.emit(deadMansSwitch, "SwitchDeactivated")
        .withArgs(owner.address);
    });

    it("Should allow creating a new switch after deactivation", async function () {
      await deadMansSwitch.deactivateSwitch();
      await deadMansSwitch.createSwitch(INTERVAL * 2, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
      const details = await deadMansSwitch.getSwitchDetails(owner.address);
      expect(details.heartbeatInterval).to.equal(INTERVAL * 2);
      expect(details.isActive).to.be.true;
    });
  });

  describe("timeUntilTrigger", function () {
    it("Should return remaining time correctly", async function () {
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
      const remaining = await deadMansSwitch.timeUntilTrigger(owner.address);
      expect(remaining).to.be.closeTo(INTERVAL, 5);
    });

    it("Should return 0 after interval expires", async function () {
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
      await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
      await network.provider.send("evm_mine");
      expect(await deadMansSwitch.timeUntilTrigger(owner.address)).to.equal(0);
    });
  });

  describe("updateSwitchMetadata", function () {
    beforeEach(async () => {
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
    });

    it("Should update arweave TX and lit ACC ID", async function () {
      await deadMansSwitch.updateSwitchMetadata("new_arweave_tx", "new_lit_acc");
      const details = await deadMansSwitch.getSwitchDetails(owner.address);
      expect(details.arweaveTxId).to.equal("new_arweave_tx");
      expect(details.litAccessControlId).to.equal("new_lit_acc");
    });

    it("Should emit SwitchUpdated event", async function () {
      await expect(deadMansSwitch.updateSwitchMetadata("new_arweave_tx", "new_lit_acc"))
        .to.emit(deadMansSwitch, "SwitchUpdated")
        .withArgs(owner.address, "new_arweave_tx", "new_lit_acc");
    });
  });

  describe("getSwitchOwnerCount", function () {
    it("Should track switch owner count", async function () {
      expect(await deadMansSwitch.getSwitchOwnerCount()).to.equal(0);
      await deadMansSwitch.createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
      expect(await deadMansSwitch.getSwitchOwnerCount()).to.equal(1);
      await deadMansSwitch.connect(other).createSwitch(INTERVAL, ARWEAVE_TX, LIT_ACC_ID, recipient.address);
      expect(await deadMansSwitch.getSwitchOwnerCount()).to.equal(2);
    });
  });
});
