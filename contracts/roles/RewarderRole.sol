pragma solidity 0.5.4;

import "openzeppelin-solidity/contracts/access/Roles.sol";


// @notice Rewarders are capable of managing the Rewards contract and depositing PAY rewards.
contract RewarderRole {
    using Roles for Roles.Role;

    event RewarderAdded(address indexed account);
    event RewarderRemoved(address indexed account);

    Roles.Role internal _rewarders;

    modifier onlyRewarder() {
        require(isRewarder(msg.sender), "Only Rewarders can execute this function.");
        _;
    }

    constructor() internal {
        _addRewarder(msg.sender);
    }    

    function isRewarder(address account) public view returns (bool) {
        return _rewarders.has(account);
    }

    function addRewarder(address account) public onlyRewarder {
        _addRewarder(account);
    }

    function renounceRewarder() public {
        _removeRewarder(msg.sender);
    }
  
    function _addRewarder(address account) internal {
        _rewarders.add(account);
        emit RewarderAdded(account);
    }

    function _removeRewarder(address account) internal {
        _rewarders.remove(account);
        emit RewarderRemoved(account);
    }
}