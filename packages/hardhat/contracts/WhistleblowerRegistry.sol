// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title WhistleblowerRegistry
 * @notice Stores hashes of Reclaim Protocol zkTLS proofs on-chain to establish
 * whistleblower credibility without revealing identity. Journalists can
 * verify that a source has cryptographic proof of employment/access
 * by checking the proof hashes stored here against the off-chain JSON proofs.
 * @dev Only proof hashes (bytes32) are stored on-chain. The full Reclaim JSON
 * proof lives off-chain (IPFS/Arweave) and is verified client-side.
 */
contract WhistleblowerRegistry {
    // -------------------------------------------------------
    // Types
    // -------------------------------------------------------

    struct UserProfile {
        bytes32[] proofHashes;
        bool isVerified;
        uint256 registeredAt;
        string stealthMetaAddress; // ERC-5564 stealth meta-address for anonymous payments
    }

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    mapping(address => UserProfile) private profiles;

    /// @notice Track all registered users for enumeration
    address[] public registeredUsers;
    mapping(address => bool) private hasRegistered;

    /// @notice Prevent duplicate proof submission
    mapping(bytes32 => bool) public proofHashExists;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event ProofSubmitted(address indexed user, bytes32 indexed proofHash, uint256 timestamp);

    event VerificationUpdated(address indexed user, bool isVerified);

    event StealthMetaAddressUpdated(address indexed user);

    // -------------------------------------------------------
    // Write Functions
    // -------------------------------------------------------

    /**
     * @notice Submit a hash of a Reclaim zkTLS proof to build on-chain reputation.
     * The full proof JSON is stored off-chain; only its keccak256 hash is recorded here.
     * @param _proofHash keccak256 hash of the serialized Reclaim proof JSON.
     */
    function submitProofHash(bytes32 _proofHash) external {
        require(_proofHash != bytes32(0), "Invalid proof hash");
        require(!proofHashExists[_proofHash], "Proof already submitted");

        if (!hasRegistered[msg.sender]) {
            registeredUsers.push(msg.sender);
            hasRegistered[msg.sender] = true;
            profiles[msg.sender].registeredAt = block.timestamp;
        }

        profiles[msg.sender].proofHashes.push(_proofHash);
        proofHashExists[_proofHash] = true;

        // Auto-verify once at least one proof is submitted
        if (!profiles[msg.sender].isVerified) {
            profiles[msg.sender].isVerified = true;
            emit VerificationUpdated(msg.sender, true);
        }

        emit ProofSubmitted(msg.sender, _proofHash, block.timestamp);
    }

    /**
     * @notice Set or update the user's ERC-5564 stealth meta-address for anonymous payments.
     * @param _stealthMetaAddress The stealth meta-address string.
     */
    function setStealthMetaAddress(string calldata _stealthMetaAddress) external {
        require(bytes(_stealthMetaAddress).length > 0, "Empty meta-address");

        if (!hasRegistered[msg.sender]) {
            registeredUsers.push(msg.sender);
            hasRegistered[msg.sender] = true;
            profiles[msg.sender].registeredAt = block.timestamp;
        }

        profiles[msg.sender].stealthMetaAddress = _stealthMetaAddress;
        emit StealthMetaAddressUpdated(msg.sender);
    }

    // -------------------------------------------------------
    // Read Functions
    // -------------------------------------------------------

    /**
     * @notice Get all proof hashes submitted by a user.
     * @param _user Address of the whistleblower.
     */
    function getProofHashes(address _user) external view returns (bytes32[] memory) {
        return profiles[_user].proofHashes;
    }

    /**
     * @notice Check if a user has verified status (at least one proof submitted).
     * @param _user Address of the whistleblower.
     */
    function isVerified(address _user) external view returns (bool) {
        return profiles[_user].isVerified;
    }

    /**
     * @notice Get the number of proofs submitted by a user (reputation score proxy).
     * @param _user Address of the whistleblower.
     */
    function getProofCount(address _user) external view returns (uint256) {
        return profiles[_user].proofHashes.length;
    }

    /**
     * @notice Get the user's stealth meta-address.
     * @param _user Address of the whistleblower.
     */
    function getStealthMetaAddress(address _user) external view returns (string memory) {
        return profiles[_user].stealthMetaAddress;
    }

    /**
     * @notice Get the full user profile.
     * @param _user Address of the whistleblower.
     */
    function getUserProfile(
        address _user
    )
        external
        view
        returns (bytes32[] memory proofHashes, bool verified, uint256 registeredAt, string memory stealthMetaAddress)
    {
        UserProfile storage p = profiles[_user];
        return (p.proofHashes, p.isVerified, p.registeredAt, p.stealthMetaAddress);
    }

    /**
     * @notice Get the total number of registered users.
     */
    function getRegisteredUserCount() external view returns (uint256) {
        return registeredUsers.length;
    }
}
