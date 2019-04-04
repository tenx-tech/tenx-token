pragma solidity 0.5.4;

import "./IRewardsUpdatable.sol";


interface IRewardable {
    event RewardsUpdated(address implementation);

    function setRewards(IRewardsUpdatable rewards) external;
}