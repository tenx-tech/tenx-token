# Token Design

## High-Level Behaviour

The TENX token is [issued](#issuer) on a 1:1 ratio to PAY token holders. Both PAY and TENX token cap starts at ~205M and monotonically decreases through burning.

A user that holds Y% of the total cap of TENX tokens is entitled to receive Y% of the total rewards. When user A transfers their TENX tokens to user B, the rewards contract calculates a damping factor to ensure that any rewards allocated to a user before a transfer will still be consistent after the transfer.

When TENX tokens are burned, they are removed from circulation and as a result this lowers the maximum cap of TENX tokens. Burning tokens effectively increases all other token holders' portions of future rewards.

## Rewards Calculation

The TENX rewards model dynamically calculates a token holder's rewards based on their current TENX token balance and past operations. Holders of the TENX token can transfer their tokens at any time and still be sure that their past rewards are allocated correctly.

Our implementation is gas-efficient because it keeps track of user reward balances without the use of periodic snapshots nor unbounded loops. The token smart contract amortizes part of the rewards calculation (stored as a per-address damping factor) in operations such as token transfers and burns.

![](https://user-images.githubusercontent.com/1084226/48820582-81968900-ed90-11e8-90b9-5e908005a97d.png)

Let's go through an example user flow, where there the TENX cap is 200 tokens:

- In Tx 1, each of users A and B has 50 out of 200 TENX tokens. They are each entitled to 25% of declared rewards because they each hold 25% of all TENX tokens.
- In Tx 2, TenX deposits 100 PAY as rewards. The rewards balance of users A and B is now 25 each (25% * 100 PAY = 25 PAY.)
- In Tx 3, user A transfers 25 TENX to user C. The rewards contract calculates a Damping Change of +12.5 for A (taking into account the proportional rewards A was historically entitled to despite the change of TENX balance.) and -12.5 for C (because C did not hold TENX before the first rewards deposit, user C is not entitled to past rewards.) The rewards of A remains at 25 PAY and C remains at 0 PAY, despite the fact that their TENX balances are now both 25 TENX.
- The total utilized percentage of TENX tokens remains as Tx 1, which is 25 (A) + 50 (B) + 25 (C) = 100 out of 200 total TENX.

> You can play around with the rewards model [here](https://docs.google.com/spreadsheets/d/1VFk5VvUZOqtDRfmm5UKG-XjsZGtAiYG7YjRd3z_05A4/edit?usp=sharing).

### Rewards for Newly Issued Tokens

In the TENX rewards implementation, tokens that are freshly minted are entitled to past reward deposits as well. For example, if user D receives TENX tokens after some rewards have already been deposited, D will still be allocated their part of past rewards.

For example:

- Each of users A and B has 50 / 200 TENX tokens. They each hold 25% of all TENX tokens.
- TenX deposits 100 PAY as rewards.
- Both A and B can withdraw up to 25 PAY rewards each.
- User D receives 50 TENX tokens.
- D can also withdraw up to 25 PAY rewards, even though he received the tokens after the rewards deposit.

## TENX Token Cap

The TENX token cap is used as the denominator to when calculating individual user rewards. Initially this number will be 1:1 to the total supply of PAY tokens. Over time, this denominator can monotonically decrease over time as a result of TENX tokens being burned and removed from circulation.

To calculate how many TENX Tokens are part of the rewards allocation, you may follow this formula:

```
TOTAL TOKEN CAP = INITIAL TENX CAP - TOTAL TENX BURNED
```

A user's portion of a rewards deposit is calculated as:

```
MY PORTION OF THE REWARDS DEPOSIT = REWARDS DEPOSIT AMOUNT * MY TOKEN BALANCE / TOTAL TOKEN CAP
```

### On Burning Tokens and Rewards

The TENX rewards model supports the burning of tokens to remove unclaimed tokens from circulation.

For example:

- Each of users A and B has 50 / 200 TENX tokens. They each hold 25% of all TENX tokens.
- TenX deposits 100 PAY as rewards.
- Both A and B can withdraw up to 25 PAY rewards each.
- User A burns all of her 50 TENX tokens.
- The TENX cap has decreased from 200 TENX to 150 TENX tokens.
- TenX deposits another 100 PAY as rewards.
- A has 0 TENX tokens, and therefore will not receive rewards from the new deposit.
- A's rewards balance is unchanged. A can withdraw up to 25 PAY rewards.
- B now has 50/150 TENX tokens, which is ~33.3% of all TENX tokens.
- B receives ~33.3% of the 2nd 100 PAY deposit, which is ~33 PAY.
- B can withdraw up to 25 + 33 = 58 PAY rewards.

> You can see an example test case [here](https://docs.google.com/spreadsheets/d/15D2aRtVeQD-JIeR8R0J1Ji6c1kbR5I4_Q5R1URIActs/edit?usp=sharing).

## Compliance and Transfer Restrictions

To remain relevant and compliant with the evolving industry, TENX token operations such as `transfer()` and `mint()` can be restricted for blacklisted addresses, following ERC1594. TenX compliance agents can blacklist suspicious addresses by interacting with a Moderator smart contract.

## Forced Transfers

The TENX token implements ERC1644 and retains the ability to force transfer tokens between addresses to reverse fraudulent transactions, resolve lost private keys, and responding to a court order.

In the case of legal action or fund recovery, issuers may need to maintain a final authority on their tokens for the sake of compliance.

## Whitelisting for Rewards

Users will only be able to withdraw their rewards if they are in the Rewards whitelist. TenX compliance agents whitelist addresses once they've successfully passed KYC.

## Withdrawing Rewards

Users can withdraw their rewards balance by calling the `withdraw()` function of the Rewards smart contract. Alternatively, users can trigger the `withdraw()` function by sending 0 Ether to the Rewards contract address.

## Contract Upgradeability

TENX smart contracts are `Pausable` and upgradable, because it is a potentially long-lived project that may need to change as the industry evolves. Pausing contracts lets us turn on 'maintenance mode' and perform upgrades without disrupting user activity.