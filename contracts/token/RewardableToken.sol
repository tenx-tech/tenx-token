pragma solidity 0.5.4;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../interfaces/IModerator.sol";
import "../rewards/Rewardable.sol";
import "./ERC1400.sol";
import "./ERC20Capped.sol";


/**
 * @notice RewardableToken
 * @dev ERC1400 token with a token cap and amortized rewards calculations. It's pausable for contract migrations.
 */
contract RewardableToken is ERC1400, ERC20Capped, Rewardable, Pausable {
    constructor(IModerator _moderator, uint _cap) public ERC1400(_moderator) ERC20Capped(_cap) {}

    // ERC20
    function transfer(address _to, uint _value) 
        public 
        whenNotPaused
        updatesRewardsOnTransfer(msg.sender, _to, _value) returns (bool success) 
    {
        success = super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint _value) 
        public 
        whenNotPaused
        updatesRewardsOnTransfer(_from, _to, _value) returns (bool success) 
    {
        success = super.transferFrom(_from, _to, _value);
    }

    // ERC1400: ERC1594
    function issue(address _tokenHolder, uint256 _value, bytes memory _data) 
        public 
        whenNotPaused
        // No damping updates, uses unallocated rewards
    {
        super.issue(_tokenHolder, _value, _data);
    }

    function redeem(uint256 _value, bytes memory _data) 
        public 
        whenNotPaused
        updatesRewardsOnBurn(msg.sender, _value)
    {
        super.redeem(_value, _data);
    }

    function redeemFrom(address _tokenHolder, uint256 _value, bytes memory _data) 
        public
        whenNotPaused
        updatesRewardsOnBurn(_tokenHolder, _value)
    {
        super.redeemFrom(_tokenHolder, _value, _data);
    }

    // ERC1400: ERC1644
    function controllerTransfer(address _from, address _to, uint256 _value, bytes memory _data, bytes memory _operatorData) 
        public
        updatesRewardsOnTransfer(_from, _to, _value) 
    {
        super.controllerTransfer(_from, _to, _value, _data, _operatorData);
    }

    function controllerRedeem(address _tokenHolder, uint256 _value, bytes memory _data, bytes memory _operatorData) 
        public
        updatesRewardsOnBurn(_tokenHolder, _value)
    {
        super.controllerRedeem(_tokenHolder, _value, _data, _operatorData);
    }
}