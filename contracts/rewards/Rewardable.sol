pragma solidity 0.5.4;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";
import "../interfaces/IRewardsUpdatable.sol";
import "../interfaces/IRewardable.sol";


/**
 * @notice A contract with an associated Rewards contract to calculate rewards during token movements.
 */
contract Rewardable is IRewardable, Ownable {
    using SafeMath for uint;

    IRewardsUpdatable public rewards; // The rewards contract

    event RewardsUpdated(address implementation);

    /**
    * @notice Calculates and updates _dampings[address] based on the token movement.
    * @notice This modifier is applied to mint(), transfer(), and transferFrom().
    * @param _from Address of sender
    * @param _to Address of recipient
    * @param _value Amount of tokens
    */
    modifier updatesRewardsOnTransfer(address _from, address _to, uint _value) {
        _;
        require(rewards.updateOnTransfer(_from, _to, _value), "Rewards updateOnTransfer failed."); // [External contract call]
    }

    /**
    * @notice Calculates and updates _dampings[address] based on the token burning.
    * @notice This modifier is applied to burn()
    * @param _account Address of owner
    * @param _value Amount of tokens
    */
    modifier updatesRewardsOnBurn(address _account, uint _value) {
        _;
        require(rewards.updateOnBurn(_account, _value), "Rewards updateOnBurn failed."); // [External contract call]
    }

    /**
    * @notice Links a Rewards contract to this contract.
    * @param _rewards Rewards contract address.
    */
    function setRewards(IRewardsUpdatable _rewards) external onlyOwner {
        require(address(_rewards) != address(0), "Rewards address must not be a zero address.");
        require(Address.isContract(address(_rewards)), "Address must point to a contract.");
        rewards = _rewards;
        emit RewardsUpdated(address(_rewards));
    }
}