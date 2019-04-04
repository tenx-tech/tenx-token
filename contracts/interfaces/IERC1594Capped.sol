pragma solidity 0.5.4;


interface IERC1594Capped {
    function balanceOf(address who) external view returns (uint256);
    function cap() external view returns (uint256);
    function totalRedeemed() external view returns (uint256);
}