// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title DeadMansSwitch
 * @notice Manages heartbeat-based dead man's switches for whistleblowers.
 * If a user fails to check in within their configured interval,
 * the switch is considered "triggered" and encrypted data can be released
 * via Lit Protocol Access Control Conditions that call isDeceased().
 * @dev No plaintext data is stored on-chain. Only references to encrypted
 * payloads on Arweave and Lit access control identifiers are kept.
 */
contract DeadMansSwitch {
    // -------------------------------------------------------
    // Types
    // -------------------------------------------------------

    struct Switch {
        uint256 lastHeartbeat;
        uint256 heartbeatInterval; // seconds between required check-ins
        string arweaveTxId; // Arweave transaction ID of encrypted payload
        string litAccessControlId; // Lit Protocol access-control reference
        address recipient; // intended recipient (address(0) = public)
        bool isActive;
    }

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    /// @notice Each address may have one active switch
    mapping(address => Switch) public switches;

    /// @notice Track all users who have created switches for enumeration
    address[] public switchOwners;
    mapping(address => bool) private hasSwitchRecord;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event SwitchCreated(address indexed user, uint256 heartbeatInterval, string arweaveTxId, address recipient);

    event HeartbeatUpdated(address indexed user, uint256 timestamp);

    event SwitchDeactivated(address indexed user);

    event SwitchUpdated(address indexed user, string arweaveTxId, string litAccessControlId);

    // -------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------

    modifier onlyActiveSwitchOwner() {
        require(switches[msg.sender].isActive, "No active switch");
        _;
    }

    // -------------------------------------------------------
    // Write Functions
    // -------------------------------------------------------

    /**
     * @notice Create a new dead man's switch.
     * @param _heartbeatInterval Seconds the user has between check-ins before
     *        the switch is considered triggered.
     * @param _arweaveTxId Arweave transaction ID storing the encrypted payload.
     * @param _litAccessControlId Identifier for the Lit access-control condition set.
     * @param _recipient Address that should receive the decrypted data.
     *        Use address(0) to indicate public release.
     */
    function createSwitch(
        uint256 _heartbeatInterval,
        string calldata _arweaveTxId,
        string calldata _litAccessControlId,
        address _recipient
    ) external {
        require(!switches[msg.sender].isActive, "Switch already active");
        require(_heartbeatInterval > 0, "Interval must be > 0");
        require(bytes(_arweaveTxId).length > 0, "Arweave TX ID required");

        switches[msg.sender] = Switch({
            lastHeartbeat: block.timestamp,
            heartbeatInterval: _heartbeatInterval,
            arweaveTxId: _arweaveTxId,
            litAccessControlId: _litAccessControlId,
            recipient: _recipient,
            isActive: true
        });

        if (!hasSwitchRecord[msg.sender]) {
            switchOwners.push(msg.sender);
            hasSwitchRecord[msg.sender] = true;
        }

        emit SwitchCreated(msg.sender, _heartbeatInterval, _arweaveTxId, _recipient);
        emit HeartbeatUpdated(msg.sender, block.timestamp);
    }

    /**
     * @notice Update the heartbeat timestamp, proving the user is still active.
     */
    function checkIn() external onlyActiveSwitchOwner {
        switches[msg.sender].lastHeartbeat = block.timestamp;
        emit HeartbeatUpdated(msg.sender, block.timestamp);
    }

    /**
     * @notice Deactivate a switch. The user can cancel their switch while alive.
     */
    function deactivateSwitch() external onlyActiveSwitchOwner {
        switches[msg.sender].isActive = false;
        emit SwitchDeactivated(msg.sender);
    }

    /**
     * @notice Update storage references (e.g. after re-encrypting or re-uploading).
     * @param _arweaveTxId New Arweave transaction ID.
     * @param _litAccessControlId New Lit access-control identifier.
     */
    function updateSwitchMetadata(
        string calldata _arweaveTxId,
        string calldata _litAccessControlId
    ) external onlyActiveSwitchOwner {
        if (bytes(_arweaveTxId).length > 0) {
            switches[msg.sender].arweaveTxId = _arweaveTxId;
        }
        if (bytes(_litAccessControlId).length > 0) {
            switches[msg.sender].litAccessControlId = _litAccessControlId;
        }
        emit SwitchUpdated(msg.sender, _arweaveTxId, _litAccessControlId);
    }

    // -------------------------------------------------------
    // Read Functions (used by Lit Access Control Conditions)
    // -------------------------------------------------------

    /**
     * @notice Returns true if the user's heartbeat has expired.
     * This is the primary function called by Lit Protocol ACCs
     * to determine whether decryption should be authorized.
     * @param _user Address of the switch owner.
     * @return True if the user has not checked in within their interval.
     */
    function isDeceased(address _user) external view returns (bool) {
        Switch storage s = switches[_user];
        if (!s.isActive) return false;
        return block.timestamp > s.lastHeartbeat + s.heartbeatInterval;
    }

    /**
     * @notice Get the full details of a user's switch.
     * @param _user Address of the switch owner.
     */
    function getSwitchDetails(
        address _user
    )
        external
        view
        returns (
            uint256 lastHeartbeat,
            uint256 heartbeatInterval,
            string memory arweaveTxId,
            string memory litAccessControlId,
            address recipient,
            bool isActive
        )
    {
        Switch storage s = switches[_user];
        return (s.lastHeartbeat, s.heartbeatInterval, s.arweaveTxId, s.litAccessControlId, s.recipient, s.isActive);
    }

    /**
     * @notice Get the number of switch owners (for off-chain enumeration).
     */
    function getSwitchOwnerCount() external view returns (uint256) {
        return switchOwners.length;
    }

    /**
     * @notice Seconds remaining until the switch triggers (0 if already triggered).
     * @param _user Address of the switch owner.
     */
    function timeUntilTrigger(address _user) external view returns (uint256) {
        Switch storage s = switches[_user];
        if (!s.isActive) return 0;
        uint256 deadline = s.lastHeartbeat + s.heartbeatInterval;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }
}
