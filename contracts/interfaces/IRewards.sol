pragma solidity 0.5.4;


interface IRewards {
    event Deposited(address indexed from, uint amount);
    event Withdrawn(address indexed from, uint amount);
    event Reclaimed(uint amount);

    function deposit(uint amount) external;
    function withdraw() external;
    function reclaimRewards() external;
    function claimedRewards(address payee) external view returns (uint);
    function unclaimedRewards(address payee) external view returns (uint);
    function supply() external view returns (uint);
    function isRunning() external view returns (bool);
}