# Smart Contract Architecture

This document outlines the technical architecture of the smart contracts that make up the TENX token.

## Overview

There are three key flows around the TENX token:

- How TENX tokens are issued to PAY holders.
- How secondary transfers are moderator according to compliance requirements.
- How rewards for TENX holders are calculated and disbursed.

## Contracts

The `/contracts` directory contains a set of smart contracts that govern different responsibilities:

- **Issuance**: How new TENX tokens are issued to existing PAY token holders.
- **Token**: The TENX ERC20 token contract maintains user balances, token operations, and enforces transfer restrictions.
- **Rewards**: How PAY token rewards are disbursed to TENX token holders.
- **Moderator** contracts that checks for transfer restrictions to satisfy continuously changing compliance requirements.
- Miscellaneous reusable contracts, interfaces, and libraries.

The above responsibilities are each handled by the following contracts:

- `Issuer.sol`: This contract issues claims for TENX tokens which users can claim. Only one Issuer contract is active at one time.
- `TENXToken.sol`: This contract mints new TENX tokens, handles transfers, and stores TENX user balances.
- `Rewards.sol`: This contract determines the amount of rewards each user is entitled to and allows users to withdraw their rewards.
- `BlacklistModerator.sol`: This contract maintains compliance rules for moderating certain token operations.

### [Issuer](https://github.com/tenx-tech/tenx-token/blob/master/contracts/issuer/Issuer.sol)

<details>
  <summary>SequenceDiagram.org source</summary>
title Issuing TENX Tokens to Users

User->TenX:User submits KYC with a list of PAY holding addresses

activate TenX

TenX-->User: KYC is successful


deactivate TenX



TenX->Issuer: airdrop() based on PAY snapshot


activate Issuer

Issuer->Issuer: The user's TENX Claim is marked as CLAIMED


Issuer --> TenX: TENX tokens are minted to the Claim address

deactivate Issuer

</details>

![Issuing TENX Tokens to Users](https://github.com/tenx-tech/tenx-token/raw/master/docs/issuingFlow.png)

The `Issuer` contract provides two methods to issue new tokens:

- An 'async' two-step pull-payment method with `Issuer.issue()` and `Issuer.claim()`.
- A single-step push-payment method with `Issuer.airdrop()`.

In the first method:

- The `Issuer` contains a list of **Claims** for TENX tokens, based on PAY balances in the snapshot. Claims starts in the NONE state.

| address | amount | status   |
|---------|--------|----------|
| 0x...   | 100    | NONE  |
| 0x...   | 200    | ISSUED |
| 0x...   | 150    | CLAIMED  |

- For each PAY holder, TenX creates a new Claim with status ISSUED containing the issued 1:1 TENX amount by calling `Issuer.issue()`.
- Once a Claim is ISSUED, the User can claim TENX tokens by calling `Issuer.claim()` via their wallet address.
- The Claim becomes CLAIMED.
- The Issuer mints TENX tokens equal to the claim amount to the User's claim address.

In the second method:

- The Issuer can call `Issuer.airdrop()` function that transfers tokens directly to the payee.

> **Note:** Issuer operations can fail - by design - if moderatory requirements are not met (e.g. the payee's address is blacklisted by the `BlacklistModerator`.)

### [TENXToken](https://github.com/tenx-tech/tenx-token/blob/master/contracts/TENXToken.sol)

<details>
  <summary>SequenceDiagram.org source</summary>
title Issuing new TENX Tokens

TENXToken->Issuer: TENXToken.transferIssuership(): Adds Issuer contract as an allowed Issuer

User->Issuer: Claims TENX tokens

activate Issuer

Issuer->Issuer: Checks that the Claim is ISSUED

Issuer->Issuer: Marks Claim as CLAIMED

Issuer->TENXToken: Calls TENXToken.issue()

activate TENXToken

TENXToken->TENXToken: Mints new TENX tokens to the User's address

TENXToken-->Issuer:

deactivate TENXToken

Issuer--> User:
deactivate Issuer

</details>

![Minting new TENX Tokens](https://github.com/tenx-tech/tenx-token/raw/master/docs/mintingFlow.png)

- The `TENXToken` contract is an ERC20+[1400](https://github.com/ethereum/EIPs/issues/1400) token. It has additional functionality around keeping track of rewards for token holders.
- The `TENXToken` contract keeps track of user balances and allows token transfers.
- The `TENXToken` contract grants an `Issuer` contract permission to mint tokens. Only a single Issuer is ever active at one time, and this invariant is managed by the `IHasIssuership.transferIssuership()` function.

> Read more about [security token standards](https://yos.io/2018/10/31/security-token-standards/).

### [Rewards](https://github.com/tenx-tech/tenx-token/blob/master/contracts/rewards/Rewards.sol)

> A spreadsheet of the rewards arithmetic model can be found [here](https://docs.google.com/spreadsheets/d/1VFk5VvUZOqtDRfmm5UKG-XjsZGtAiYG7YjRd3z_05A4/edit#gid=0).

The `Rewards` contracts are split into two:

- `Rewards.sol`: Calculates user rewards balances, allows TenX to deposit a supply of reward tokens (PAY tokens) to the contract, and allows users to withdraw their accumulated rewards.
- `Rewardable.sol`: Contains a modifier `updatesRewardsOnTransfer` that calculates and sets a damping factor to calculate each user's rewards dynamically. The modifier is applied to any token movement such `transfer()`, and `transferFrom()` by inheriting from this contract.
- The Rewards contract listens to transfer and burn events from the token contract.
- Reward balances are calculated dynamically and in an amortized way, without the use of snapshots nor loops.

<details>
  <summary>SequenceDiagram.org source</summary>
title TENX Rewards Flow

A->TENXToken: TENXToken.transfer(B, 100)

activate TENXToken

TENXToken->TENXToken: updatesRewardsOnTransfer()

TENXToken->Rewards: Rewards.updateOnTransfer()

activate Rewards

Rewards->Rewards: Calculates and updates dampings[sender] and dampings[recipient] to account for token movements

Rewards-->TENXToken:

deactivate Rewards

TENXToken-->A:

deactivate TENXToken

A->TENXToken: TENXToken.redeem(100)

activate TENXToken

TENXToken->TENXToken: updatesRewardsOnBurn()

TENXToken->Rewards: Rewards.updateOnBurn()

activate Rewards

Rewards->Rewards: Calculates and updates dampings[account] to take into account burning tokens from circulation.

Rewards-->TENXToken:

deactivate Rewards

TENXToken-->A:

deactivate TENXToken

A->Rewards: TENXToken.unclaimedRewards(A)

Rewards-->A: Returns total unclaimed amount of user rewards for user A

TenX->Rewards: Rewards.deposit()

Rewards-->TenX: TenX sent PAY tokens to supply rewards contract.

A->Rewards: Rewards.withdraw()

Rewards-->A: Transfers PAY tokens to A equal to their unclaimed rewards
</details>

![TENX Reward flow](https://github.com/tenx-tech/tenx-token/raw/master/docs/rewardFlow.png)

- For all transfers, the `TENXToken` contract calculates a damping factor by calling `Rewards.updateOnTransfer()`.
- For all burns, the `TENXToken` contract calculates a damping factor by calling `Rewards.updateOnBurn()`.
- Both of the above methods ensure that the user reward balances are consistent over time.
- TenX deposits PAY tokens to a global pool within the `Rewards` contract, by calling `Rewards.deposit(<amount>)`.
- Token holders can withdraw their rewards with `Rewards.withdraw()` from the smart contract.
- Alternatively, token holders can `withdraw()` via an Ether fallback function by sending 0 ETH to the Rewards contract address.

#### Whitelisting for Claiming Rewards

Users will only be able to withdraw their rewards if they are in the Rewards whitelist.

Compliance agents can call the `whitelist(address)` function to allow an address to withdraw their rewards balance to another address. They can call `unwhitelist(address)` to remove an address from the whitelist.

### 1400 Security Token Standard

The TENX token implements [the ERC1400 token standard](https://github.com/ethereum/EIPs/issues/1411).

The ERC1400 standard is split into several modular sub-standards:

- [ERC1410](https://github.com/ethereum/EIPs/issues/1410) which defines partially fungible tokens where balances of tokens can have an associated metadata.
- [ERC1594](https://github.com/ethereum/EIPs/issues/1594) which defines transfer restrictions and core security token functionality.
- [ERC1643](https://github.com/ethereum/EIPs/issues/1643) which splits out document management functionality.
- [ERC1644](https://github.com/ethereum/EIPs/issues/1644) which splits out controller operation functionality.

In particular, the TenX Token implements:

- ERC1594 Transfer Restrictions, and
- ERC1644 Controller Operations.

Both token transfers and controller operations may be restricted according to moderatory compliance requirements.

#### Moderator Contracts

A key part of a security token is enforcing moderatory restrictions. We extract these business rules out from the token to a separate smart contract. `Moderator` contracts are contracts that enforce transfer restrictions required by security tokens. The Moderator smart contracts implements the following interface:

```
pragma solidity 0.5.2;


interface IModerator {
    function verifyIssue(address _tokenHolder, uint256 _value, bytes _data) external view
        returns (bool allowed, byte statusCode, bytes32 applicationCode);

    function verifyTransfer(address _from, address _to, uint256 _amount, bytes _data) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode);

    function verifyTransferFrom(address _from, address _to, address _forwarder, uint256 _amount, bytes _data) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode);
}
```

The token implements a similar interface, which calls the moderator:

```
interface IERC1594 { // is IERC20
    // Transfer Validity
    function canTransfer(address _to, uint256 _value, bytes _data) public view returns (bool, byte, bytes32);
    function canTransferFrom(address _from, address _to, uint256 _value, bytes _data) public view returns (bool, byte, bytes32);
}
```

The `verify*` functions are called behind the scenes by `check*` functions prior to their respective token movement:

```
    function transfer(address _to, uint256 _value) public returns (bool success) {
        bool allowed;
        (allowed, , ) = canTransfer(_to, _value, "");
        require(allowed, "Transfer is not allowed.");

        success = super.transfer(_to, _value);
    }

function canTransfer(address _to, uint256 _value, bytes _data) public view 
    returns (bool success, byte statusCode, bytes32 applicationCode) 
{
    return moderator.verifyTransfer(msg.sender, _to, _value, _data);
}
```

### ERC1594 Restricted Transfers for Blacklisted Addresses

In the initial rollout, the TENX token will have unrestricted transfers by default but with blacklisting enabled to block suspicious addresses. To achieve this, we use a `BlacklistModerator` contract.

Compliance agents can call the `blacklist(address)` function to prevent an address from sending or receiving TENX tokens. They can call `unblacklist(address)` to remove an address from the blacklist.

### ERC1644 Controller Transfers

In the initial rollout, the TENX token retains the ability to perform forced transfers between addresses to reverse fradulent transactions or the loss of a private key.
