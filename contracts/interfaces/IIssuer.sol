pragma solidity 0.5.4;


interface IIssuer {
    event Issued(address indexed payee, uint amount);
    event Claimed(address indexed payee, uint amount);
    event FinishedIssuing(address indexed issuer);

    function issue(address payee, uint amount) external;
    function claim() external;
    function airdrop(address payee, uint amount) external;
    function isRunning() external view returns (bool);
}