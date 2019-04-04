pragma solidity 0.5.4;


interface IRewardsUpdatable {
    event NotifierUpdated(address implementation);

    function updateOnTransfer(address from, address to, uint amount) external returns (bool);
    function updateOnBurn(address account, uint amount) external returns (bool);
    function setRewardsNotifier(address notifier) external;
}