import { expect } from "chai";
import { ethers } from "hardhat";
import { Marketplace } from "../typechain-types";

describe("Marketplace", function () {
  let marketplace: Marketplace;
  let feeRecipient: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let whistleblower: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let journalist: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let stealthAddr: Awaited<ReturnType<typeof ethers.getSigners>>[0];

  const DESC_HASH = "QmDescriptionHash123";
  const ARWEAVE_TX = "arweave_tx_payload_456";
  const MIN_BID = ethers.parseEther("0.1");
  const BID_AMOUNT = ethers.parseEther("1.0");

  beforeEach(async () => {
    [feeRecipient, whistleblower, journalist, stealthAddr] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("Marketplace");
    marketplace = (await factory.deploy(feeRecipient.address)) as Marketplace;
    await marketplace.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the fee recipient", async function () {
      expect(await marketplace.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should reject zero address fee recipient", async function () {
      const factory = await ethers.getContractFactory("Marketplace");
      await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWith("Invalid fee recipient");
    });

    it("Should have PLATFORM_FEE_BPS of 250", async function () {
      expect(await marketplace.PLATFORM_FEE_BPS()).to.equal(250);
    });
  });

  describe("createListing", function () {
    it("Should create a listing with correct parameters", async function () {
      await marketplace.connect(whistleblower).createListing(DESC_HASH, ARWEAVE_TX, MIN_BID, true);

      const listing = await marketplace.getListing(0);
      expect(listing.whistleblower).to.equal(whistleblower.address);
      expect(listing.descriptionHash).to.equal(DESC_HASH);
      expect(listing.arweaveTxId).to.equal(ARWEAVE_TX);
      expect(listing.minimumBid).to.equal(MIN_BID);
      expect(listing.isActive).to.be.true;
      expect(listing.isVerified).to.be.true;
    });

    it("Should emit ListingCreated event", async function () {
      await expect(marketplace.connect(whistleblower).createListing(DESC_HASH, ARWEAVE_TX, MIN_BID, true))
        .to.emit(marketplace, "ListingCreated")
        .withArgs(0, whistleblower.address, DESC_HASH, MIN_BID);
    });

    it("Should increment listing count", async function () {
      await marketplace.connect(whistleblower).createListing(DESC_HASH, ARWEAVE_TX, MIN_BID, false);
      await marketplace.connect(whistleblower).createListing(DESC_HASH, ARWEAVE_TX, MIN_BID, false);
      expect(await marketplace.listingCount()).to.equal(2);
    });

    it("Should reject empty description hash", async function () {
      await expect(marketplace.connect(whistleblower).createListing("", ARWEAVE_TX, MIN_BID, false)).to.be.revertedWith(
        "Description hash required",
      );
    });

    it("Should reject empty Arweave TX ID", async function () {
      await expect(marketplace.connect(whistleblower).createListing(DESC_HASH, "", MIN_BID, false)).to.be.revertedWith(
        "Arweave TX ID required",
      );
    });
  });

  describe("placeBid", function () {
    beforeEach(async () => {
      await marketplace.connect(whistleblower).createListing(DESC_HASH, ARWEAVE_TX, MIN_BID, true);
    });

    it("Should place a bid with correct amount", async function () {
      await marketplace.connect(journalist).placeBid(0, { value: BID_AMOUNT });
      const bid = await marketplace.getBid(0, 0);
      expect(bid.bidder).to.equal(journalist.address);
      expect(bid.amount).to.equal(BID_AMOUNT);
      expect(bid.isAccepted).to.be.false;
      expect(bid.isWithdrawn).to.be.false;
    });

    it("Should emit BidPlaced event", async function () {
      await expect(marketplace.connect(journalist).placeBid(0, { value: BID_AMOUNT }))
        .to.emit(marketplace, "BidPlaced")
        .withArgs(0, 0, journalist.address, BID_AMOUNT);
    });

    it("Should reject bid below minimum", async function () {
      const lowBid = ethers.parseEther("0.01");
      await expect(marketplace.connect(journalist).placeBid(0, { value: lowBid })).to.be.revertedWith(
        "Bid below minimum",
      );
    });

    it("Should reject bid on inactive listing", async function () {
      await marketplace.connect(whistleblower).deactivateListing(0);
      await expect(marketplace.connect(journalist).placeBid(0, { value: BID_AMOUNT })).to.be.revertedWith(
        "Listing not active",
      );
    });

    it("Should reject whistleblower bidding on own listing", async function () {
      await expect(marketplace.connect(whistleblower).placeBid(0, { value: BID_AMOUNT })).to.be.revertedWith(
        "Cannot bid on own listing",
      );
    });
  });

  describe("acceptBid", function () {
    beforeEach(async () => {
      await marketplace.connect(whistleblower).createListing(DESC_HASH, ARWEAVE_TX, MIN_BID, true);
      await marketplace.connect(journalist).placeBid(0, { value: BID_AMOUNT });
    });

    it("Should transfer funds to stealth address minus fee", async function () {
      const stealthBalanceBefore = await ethers.provider.getBalance(stealthAddr.address);
      const feeBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

      await marketplace.connect(whistleblower).acceptBid(0, 0, stealthAddr.address);

      const stealthBalanceAfter = await ethers.provider.getBalance(stealthAddr.address);
      const feeBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      const expectedFee = (BID_AMOUNT * 250n) / 10000n; // 2.5%
      const expectedPayout = BID_AMOUNT - expectedFee;

      expect(stealthBalanceAfter - stealthBalanceBefore).to.equal(expectedPayout);
      expect(feeBalanceAfter - feeBalanceBefore).to.equal(expectedFee);
    });

    it("Should emit BidAccepted event", async function () {
      const expectedFee = (BID_AMOUNT * 250n) / 10000n;
      const expectedPayout = BID_AMOUNT - expectedFee;

      await expect(marketplace.connect(whistleblower).acceptBid(0, 0, stealthAddr.address))
        .to.emit(marketplace, "BidAccepted")
        .withArgs(0, 0, stealthAddr.address, expectedPayout);
    });

    it("Should deactivate listing after accepting bid", async function () {
      await marketplace.connect(whistleblower).acceptBid(0, 0, stealthAddr.address);
      const listing = await marketplace.getListing(0);
      expect(listing.isActive).to.be.false;
    });

    it("Should reject if not listing owner", async function () {
      await expect(marketplace.connect(journalist).acceptBid(0, 0, stealthAddr.address)).to.be.revertedWith(
        "Not listing owner",
      );
    });

    it("Should reject accepting same bid twice", async function () {
      await marketplace.connect(whistleblower).acceptBid(0, 0, stealthAddr.address);
      // Listing is now inactive, so this should fail
      await expect(marketplace.connect(whistleblower).acceptBid(0, 0, stealthAddr.address)).to.be.revertedWith(
        "Listing not active",
      );
    });

    it("Should reject zero stealth address", async function () {
      await expect(marketplace.connect(whistleblower).acceptBid(0, 0, ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid stealth address",
      );
    });
  });

  describe("withdrawBid", function () {
    beforeEach(async () => {
      await marketplace.connect(whistleblower).createListing(DESC_HASH, ARWEAVE_TX, MIN_BID, true);
      await marketplace.connect(journalist).placeBid(0, { value: BID_AMOUNT });
    });

    it("Should refund the bid amount to the bidder", async function () {
      const balanceBefore = await ethers.provider.getBalance(journalist.address);
      const tx = await marketplace.connect(journalist).withdrawBid(0, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(journalist.address);

      expect(balanceAfter + gasUsed - balanceBefore).to.equal(BID_AMOUNT);
    });

    it("Should emit BidWithdrawn event", async function () {
      await expect(marketplace.connect(journalist).withdrawBid(0, 0))
        .to.emit(marketplace, "BidWithdrawn")
        .withArgs(0, 0, journalist.address, BID_AMOUNT);
    });

    it("Should reject withdraw by non-bidder", async function () {
      await expect(marketplace.connect(whistleblower).withdrawBid(0, 0)).to.be.revertedWith("Not bid owner");
    });

    it("Should reject double withdrawal", async function () {
      await marketplace.connect(journalist).withdrawBid(0, 0);
      await expect(marketplace.connect(journalist).withdrawBid(0, 0)).to.be.revertedWith("Already withdrawn");
    });

    it("Should reject withdrawing an accepted bid", async function () {
      await marketplace.connect(whistleblower).acceptBid(0, 0, stealthAddr.address);
      await expect(marketplace.connect(journalist).withdrawBid(0, 0)).to.be.revertedWith("Bid already accepted");
    });
  });

  describe("deactivateListing", function () {
    beforeEach(async () => {
      await marketplace.connect(whistleblower).createListing(DESC_HASH, ARWEAVE_TX, MIN_BID, true);
    });

    it("Should deactivate listing", async function () {
      await marketplace.connect(whistleblower).deactivateListing(0);
      const listing = await marketplace.getListing(0);
      expect(listing.isActive).to.be.false;
    });

    it("Should reject if not listing owner", async function () {
      await expect(marketplace.connect(journalist).deactivateListing(0)).to.be.revertedWith("Not listing owner");
    });

    it("Should reject deactivating already inactive listing", async function () {
      await marketplace.connect(whistleblower).deactivateListing(0);
      await expect(marketplace.connect(whistleblower).deactivateListing(0)).to.be.revertedWith("Already inactive");
    });
  });
});
