pragma solidity 0.5.4;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./RewardableToken.sol";
import "../interfaces/IModerator.sol";


/**
 * @notice TENXToken
 */
contract TENXToken is RewardableToken, ERC20Detailed("TenX Token", "TENX", 18) {
    constructor(IModerator _moderator, uint _cap) public RewardableToken(_moderator, _cap) {}
}
