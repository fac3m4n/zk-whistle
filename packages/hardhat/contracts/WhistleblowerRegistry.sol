// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WhistleblowerRegistry
 * @notice Stores hashes of Reclaim Protocol zkTLS proofs on-chain to establish
 * whistleblower credibility without revealing identity. Journalists can
 * verify that a source has cryptographic proof of employment/access
 * by checking the proof hashes stored here against the off-chain JSON proofs.
 * @dev Only proof hashes (bytes32) are stored on-chain. The full Reclaim JSON
 * proof lives off-chain (IPFS/Arweave) and is verified off-chain.
 *
 * Trust model for `isVerified`:
 * The EVM cannot (cheaply) re-run a Reclaim zkTLS proof, so on-chain code cannot
 * by itself prove that a submitted `proofHash` corresponds to a valid proof.
 * Two verification modes are therefore supported:
 *   1. Attested mode (recommended for production): an authorized verifier — the
 *      contract owner, representing an off-chain validator or a Lit Action that
 *      actually checks the Reclaim witness signatures — calls
 *      {attestVerification}. `isVerified` reflects that explicit attestation.
 *   2. Trust-on-submit mode (development/demo convenience): when
 *      {autoVerifyOnSubmit} is enabled, a user is marked verified as soon as
 *      they record any proof hash. This is NOT a cryptographic guarantee and
 *      should be disabled in production.
 */
contract WhistleblowerRegistry is Ownable {
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

    /// @notice When true, the first recorded proof hash trust-marks the user as
    /// verified without an explicit attestation. Convenience for dev/demo only.
    bool public autoVerifyOnSubmit;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event ProofSubmitted(address indexed user, bytes32 indexed proofHash, uint256 timestamp);

    event VerificationUpdated(address indexed user, bool isVerified);

    event StealthMetaAddressUpdated(address indexed user);

    event AutoVerifyConfigured(bool enabled);

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /**
     * @param _autoVerifyOnSubmit Enable trust-on-submit verification (dev/demo). Set
     *        false in production and use {attestVerification} instead.
     */
    constructor(bool _autoVerifyOnSubmit) Ownable(msg.sender) {
        autoVerifyOnSubmit = _autoVerifyOnSubmit;
        emit AutoVerifyConfigured(_autoVerifyOnSubmit);
    }

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

        _ensureRegistered(msg.sender);

        profiles[msg.sender].proofHashes.push(_proofHash);
        proofHashExists[_proofHash] = true;

        // Trust-on-submit verification (dev/demo only — see contract-level docs).
        if (autoVerifyOnSubmit && !profiles[msg.sender].isVerified) {
            profiles[msg.sender].isVerified = true;
            emit VerificationUpdated(msg.sender, true);
        }

        emit ProofSubmitted(msg.sender, _proofHash, block.timestamp);
    }

    /**
     * @notice Authoritatively set a user's verified status after their proof has
     * been validated off-chain (or by a Lit Action acting as the verifier).
     * @dev Restricted to the owner/verifier. This is the production path that gives
     * `isVerified` real meaning, independent of {autoVerifyOnSubmit}.
     * @param _user The whistleblower whose status is being attested.
     * @param _status True to mark verified, false to revoke.
     */
    function attestVerification(address _user, bool _status) external onlyOwner {
        require(hasRegistered[_user], "User not registered");
        if (profiles[_user].isVerified != _status) {
            profiles[_user].isVerified = _status;
            emit VerificationUpdated(_user, _status);
        }
    }

    /**
     * @notice Toggle trust-on-submit verification. Should be disabled in production.
     * @param _enabled New value for {autoVerifyOnSubmit}.
     */
    function setAutoVerifyOnSubmit(bool _enabled) external onlyOwner {
        autoVerifyOnSubmit = _enabled;
        emit AutoVerifyConfigured(_enabled);
    }

    /**
     * @notice Set or update the user's ERC-5564 stealth meta-address for anonymous payments.
     * @param _stealthMetaAddress The stealth meta-address string.
     */
    function setStealthMetaAddress(string calldata _stealthMetaAddress) external {
        require(bytes(_stealthMetaAddress).length > 0, "Empty meta-address");

        _ensureRegistered(msg.sender);

        profiles[msg.sender].stealthMetaAddress = _stealthMetaAddress;
        emit StealthMetaAddressUpdated(msg.sender);
    }

    /**
     * @dev Register a user on first interaction so enumeration and timestamps are tracked.
     */
    function _ensureRegistered(address _user) private {
        if (!hasRegistered[_user]) {
            registeredUsers.push(_user);
            hasRegistered[_user] = true;
            profiles[_user].registeredAt = block.timestamp;
        }
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
