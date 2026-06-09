// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * @notice Minimal view into the WhistleblowerRegistry used to source verified status.
 */
interface IWhistleblowerRegistry {
    function isVerified(address user) external view returns (bool);
}

/**
 * @title Marketplace
 * @notice Anonymous information marketplace where whistleblowers list encrypted
 * data and journalists place bids. When a bid is accepted, funds are sent
 * to an ERC-5564 stealth address to break the on-chain link between
 * payer and receiver.
 * @dev No plaintext data is stored. Only description hashes, Arweave TX IDs
 * (pointing to encrypted payloads), and payment state are kept on-chain.
 */
contract Marketplace {
    // -------------------------------------------------------
    // Types
    // -------------------------------------------------------

    struct Listing {
        address whistleblower;
        string descriptionHash; // IPFS/Arweave CID of encrypted description
        string arweaveTxId; // Arweave TX ID of the encrypted payload
        uint256 minimumBid;
        bool isActive;
        bool isVerified; // mirrors WhistleblowerRegistry verified status
        uint256 createdAt;
        uint256 bidCount;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        bool isAccepted;
        bool isWithdrawn;
    }

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => mapping(uint256 => Bid)) public bids;

    /// @notice Platform fee in basis points (e.g. 250 = 2.5%)
    uint256 public constant PLATFORM_FEE_BPS = 250;
    address public immutable feeRecipient;

    /// @notice Registry consulted for a whistleblower's verified (credibility) status.
    IWhistleblowerRegistry public immutable registry;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event ListingCreated(
        uint256 indexed listingId,
        address indexed whistleblower,
        string descriptionHash,
        uint256 minimumBid
    );

    event ListingDeactivated(uint256 indexed listingId);

    event BidPlaced(uint256 indexed listingId, uint256 indexed bidIndex, address indexed bidder, uint256 amount);

    event BidAccepted(uint256 indexed listingId, uint256 indexed bidIndex, address stealthAddress, uint256 amount);

    event BidWithdrawn(uint256 indexed listingId, uint256 indexed bidIndex, address indexed bidder, uint256 amount);

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /**
     * @param _feeRecipient Address that receives platform fees.
     * @param _registry WhistleblowerRegistry used to determine verified status.
     */
    constructor(address _feeRecipient, address _registry) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_registry != address(0), "Invalid registry");
        feeRecipient = _feeRecipient;
        registry = IWhistleblowerRegistry(_registry);
    }

    // -------------------------------------------------------
    // Write Functions
    // -------------------------------------------------------

    /**
     * @notice Create a new listing for encrypted information.
     * @dev The verified flag is read from the registry for the caller and cannot be
     *      self-asserted, so a "Verified Source" badge always reflects on-chain reputation.
     * @param _descriptionHash IPFS/Arweave hash of the encrypted description.
     * @param _arweaveTxId Arweave TX ID of the encrypted payload.
     * @param _minimumBid Minimum bid amount in wei.
     */
    function createListing(
        string calldata _descriptionHash,
        string calldata _arweaveTxId,
        uint256 _minimumBid
    ) external returns (uint256) {
        require(bytes(_descriptionHash).length > 0, "Description hash required");
        require(bytes(_arweaveTxId).length > 0, "Arweave TX ID required");

        uint256 listingId = listingCount;
        listings[listingId] = Listing({
            whistleblower: msg.sender,
            descriptionHash: _descriptionHash,
            arweaveTxId: _arweaveTxId,
            minimumBid: _minimumBid,
            isActive: true,
            isVerified: registry.isVerified(msg.sender),
            createdAt: block.timestamp,
            bidCount: 0
        });

        listingCount++;

        emit ListingCreated(listingId, msg.sender, _descriptionHash, _minimumBid);
        return listingId;
    }

    /**
     * @notice Deactivate a listing. Only the whistleblower can deactivate.
     * @param _listingId ID of the listing to deactivate.
     */
    function deactivateListing(uint256 _listingId) external {
        Listing storage listing = listings[_listingId];
        require(listing.whistleblower == msg.sender, "Not listing owner");
        require(listing.isActive, "Already inactive");

        listing.isActive = false;
        emit ListingDeactivated(_listingId);
    }

    /**
     * @notice Place a bid on a listing. Funds are held in escrow.
     * @param _listingId ID of the listing to bid on.
     */
    function placeBid(uint256 _listingId) external payable {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing not active");
        require(msg.value >= listing.minimumBid, "Bid below minimum");
        require(msg.sender != listing.whistleblower, "Cannot bid on own listing");

        uint256 bidIndex = listing.bidCount;
        bids[_listingId][bidIndex] = Bid({
            bidder: msg.sender,
            amount: msg.value,
            isAccepted: false,
            isWithdrawn: false
        });

        listing.bidCount++;

        emit BidPlaced(_listingId, bidIndex, msg.sender, msg.value);
    }

    /**
     * @notice Accept a bid and release funds to the whistleblower's stealth address.
     * A platform fee is deducted and sent to the fee recipient.
     * @param _listingId ID of the listing.
     * @param _bidIndex Index of the bid to accept.
     * @param _stealthAddress ERC-5564 stealth address for anonymous payment.
     */
    function acceptBid(uint256 _listingId, uint256 _bidIndex, address payable _stealthAddress) external {
        Listing storage listing = listings[_listingId];
        require(listing.whistleblower == msg.sender, "Not listing owner");
        require(listing.isActive, "Listing not active");

        Bid storage bid = bids[_listingId][_bidIndex];
        require(!bid.isAccepted, "Bid already accepted");
        require(!bid.isWithdrawn, "Bid was withdrawn");
        require(bid.amount > 0, "Invalid bid");
        require(_stealthAddress != address(0), "Invalid stealth address");

        bid.isAccepted = true;
        listing.isActive = false;

        // Calculate and transfer fees
        uint256 fee = (bid.amount * PLATFORM_FEE_BPS) / 10000;
        uint256 payout = bid.amount - fee;

        (bool feeSuccess, ) = feeRecipient.call{ value: fee }("");
        require(feeSuccess, "Fee transfer failed");

        (bool payoutSuccess, ) = _stealthAddress.call{ value: payout }("");
        require(payoutSuccess, "Payout transfer failed");

        emit BidAccepted(_listingId, _bidIndex, _stealthAddress, payout);
    }

    /**
     * @notice Withdraw an unaccepted bid. Only the original bidder can withdraw.
     * @param _listingId ID of the listing.
     * @param _bidIndex Index of the bid to withdraw.
     */
    function withdrawBid(uint256 _listingId, uint256 _bidIndex) external {
        Bid storage bid = bids[_listingId][_bidIndex];
        require(bid.bidder == msg.sender, "Not bid owner");
        require(!bid.isAccepted, "Bid already accepted");
        require(!bid.isWithdrawn, "Already withdrawn");
        require(bid.amount > 0, "Invalid bid");

        bid.isWithdrawn = true;
        uint256 refundAmount = bid.amount;

        (bool success, ) = msg.sender.call{ value: refundAmount }("");
        require(success, "Refund failed");

        emit BidWithdrawn(_listingId, _bidIndex, msg.sender, refundAmount);
    }

    // -------------------------------------------------------
    // Read Functions
    // -------------------------------------------------------

    /**
     * @notice Get listing details.
     * @param _listingId ID of the listing.
     */
    function getListing(
        uint256 _listingId
    )
        external
        view
        returns (
            address whistleblower,
            string memory descriptionHash,
            string memory arweaveTxId,
            uint256 minimumBid,
            bool isActive,
            bool isVerified,
            uint256 createdAt,
            uint256 bidCount
        )
    {
        Listing storage l = listings[_listingId];
        return (
            l.whistleblower,
            l.descriptionHash,
            l.arweaveTxId,
            l.minimumBid,
            l.isActive,
            l.isVerified,
            l.createdAt,
            l.bidCount
        );
    }

    /**
     * @notice Get bid details.
     * @param _listingId ID of the listing.
     * @param _bidIndex Index of the bid.
     */
    function getBid(
        uint256 _listingId,
        uint256 _bidIndex
    ) external view returns (address bidder, uint256 amount, bool isAccepted, bool isWithdrawn) {
        Bid storage b = bids[_listingId][_bidIndex];
        return (b.bidder, b.amount, b.isAccepted, b.isWithdrawn);
    }
}
