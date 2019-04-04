pragma solidity 0.5.4;

import "../interfaces/IModerator.sol";
import "../roles/ModeratorRole.sol";


/**
 * @notice PermissionedModerator
 * @dev Moderator contracts manages transfer restrictions and implements the IModerator interface.
 * Each address has an associated send, receive, and timelock permissions that either allows or disallows transfers. 
 * Only whitelisted moderator addresses can set permissions.
 */
// solhint-disable no-unused-vars
contract PermissionedModerator is IModerator, ModeratorRole {
    byte internal constant STATUS_TRANSFER_FAILURE = 0x50; // Uses status codes from ERC-1066
    byte internal constant STATUS_TRANSFER_SUCCESS = 0x51;

    bytes32 internal constant ALLOWED_APPLICATION_CODE = keccak256("org.tenx.allowed");
    bytes32 internal constant FORBIDDEN_APPLICATION_CODE = keccak256("org.tenx.forbidden");

    mapping (address => Permission) public permissions; // Address-specific transfer permissions

    struct Permission {
        bool sendAllowed; // default: false
        bool receiveAllowed; // default: false
        uint256 sendTime; // block.timestamp when the sale lockup period ends and the investor can freely sell his tokens. default: 0
        uint256 receiveTime; // block.timestamp when purchase lockup period ends and investor can freely purchase tokens from others. default: 0
        uint256 expiryTime; // block.timestamp till investors KYC will be validated. After that investor need to do re-KYC. default: 0
    }

    event PermissionChanged(
        address indexed investor,
        bool sendAllowed,
        uint256 sendTime,
        bool receiveAllowed,
        uint256 receiveTime,
        uint256 expiryTime,
        address moderator
    );

    /**
    * @notice Sets transfer permissions on a specified address.
    * @param _investor Address
    * @param _sendAllowed Boolean, transfers from this address is allowed if true.
    * @param _sendTime block.timestamp only after which transfers from this address is allowed.
    * @param _receiveAllowed Boolean, transfers to this address is allowed if true.
    * @param _receiveTime block.timestamp only after which transfers to this address is allowed.
    * @param _expiryTime block.timestamp after which any transfers from this address is disallowed.
    */
    function setPermission(
        address _investor,
        bool _sendAllowed,
        uint256 _sendTime,
        bool _receiveAllowed,
        uint256 _receiveTime,
        uint256 _expiryTime) external onlyModerator {
        require(_investor != address(0), "Investor must not be a zero address.");
        require(_expiryTime > block.timestamp, "Cannot set an expired permission."); // solium-disable-line security/no-block-members
        permissions[_investor] = Permission({
            sendAllowed: _sendAllowed,
            sendTime: _sendTime,
            receiveAllowed: _receiveAllowed,
            receiveTime: _receiveTime,
            expiryTime: _expiryTime
        });
        emit PermissionChanged(_investor, _sendAllowed, _sendTime, _receiveAllowed, _receiveTime, _expiryTime, msg.sender);
    }

    /**
    * @notice Verify if an issue is allowed.
    * @param _tokenHolder address The address tokens are minted to
    * @return {
        "allowed": "Returns true if issue is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }    
    */
    function verifyIssue(address _tokenHolder, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        if (canReceive(_tokenHolder)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }    

    /**
    * @notice Verify if a transfer is allowed.
    * @param _from address The address tokens are transferred from
    * @param _to address The address tokens are transferred to
    * @return {
        "allowed": "Returns true if transfer is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }
    */
    function verifyTransfer(address _from, address _to, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode)
    {
        if (canSend(_from) && canReceive(_to)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }

    /**
    * @notice Verify if a transferFrom is allowed.
    * @param _from address The address tokens are transferred from
    * @param _to address The address tokens are transferred to
    * @return {
        "allowed": "Returns true if transferFrom is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }
    */
    function verifyTransferFrom(address _from, address _to, address, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode)
    {
        if (canSend(_from) && canReceive(_to)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }

    /**
    * @notice Verify if a redeem is allowed.
    * @dev All redeems are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if redeem is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }
    */
    function verifyRedeem(address _sender, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        if (canSend(_sender)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }

    /**
    * @notice Verify if a redeemFrom is allowed.
    * @dev All redeemFroms are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if redeem is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }
    */
    function verifyRedeemFrom(address _sender, address _tokenHolder, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        if (canSend(_sender) && canSend(_tokenHolder)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }

    /**
    * @notice Verify if a controllerTransfer is allowed.
    * @dev All controllerTransfers are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if transfer is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }    
    */
    function verifyControllerTransfer(address, address, address, uint256, bytes calldata, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = ALLOWED_APPLICATION_CODE;
    }

    /**
    * @notice Verify if a controllerRedeem is allowed.
    * @dev All controllerRedeems are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if transfer is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }    
    */
    function verifyControllerRedeem(address, address, uint256, bytes calldata, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = ALLOWED_APPLICATION_CODE;
    }

    /**
    * @notice Returns true if a transfer from an address is allowed.
    * @dev p.sendTime must be a date in the past for a transfer to be allowed.
    * @param _investor Address
    * @return true if address is whitelisted to send tokens, false otherwise.
    */
    function canSend(address _investor) public view returns (bool) {
        Permission storage p = permissions[_investor];
        // solium-disable-next-line security/no-block-members
        return (p.expiryTime > block.timestamp) && p.sendAllowed && (p.sendTime <= block.timestamp);
    }

    /**
    * @notice Returns true if a transfer to an address is allowed.
    * @dev p.receiveTime must be a date in the past for a transfer to be allowed.
    * @param _investor Address
    * @return true if address is whitelisted to receive tokens, false otherwise.
    */
    function canReceive(address _investor) public view returns (bool) {
        Permission storage p = permissions[_investor];
        // solium-disable-next-line security/no-block-members
        return (p.expiryTime > block.timestamp) && p.receiveAllowed && (p.receiveTime <= block.timestamp);
    }

    /**
    * @notice Returns true if an address is send or receive timelocked.
    * @param _investor Address
    * @return true if address is timelocked, false otherwise.
    */
    function isTimelocked(address _investor) public view returns (bool) {
        Permission storage p = permissions[_investor];
        // solium-disable-next-line security/no-block-members
        return (p.receiveTime > block.timestamp) || (p.sendTime > block.timestamp);
    }
}
