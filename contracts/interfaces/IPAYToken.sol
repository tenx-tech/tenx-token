pragma solidity >0.4.99 <0.6.0; // solhint-disable compiler-fixed


interface IPAYToken {
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
    event Mint(address indexed to, uint value);

    function transfer(address _to, uint _value) external;
    function approve(address spender, uint value) external;
    function transferFrom(address from, address to, uint value) external;
    function mint(address _to, uint _amount) external returns (bool);
    function balanceOf(address _owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);
}