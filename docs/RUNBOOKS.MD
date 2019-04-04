# Runbooks

It is impossible to know in advance whether your code is secure due to unknown unknowns. However, we have tried to design our contracts in a way that allows them to fail gracefully, and with minimal damage. Some notable design decisions:

- Both `Issuer` and `Rewards` are `Pausable` contract with circuit breakers. We can call `pause()` to halt any critical operations while we fix any issues.
- The smart contracts are written with long-term upgradability in mind, so while paused during a 'maintenance mode' period we can deploy new contracts to replace any buggy ones.
- `Rewards` are rate-limited in that it contains a small amount of PAY that needs to be transfered to it, so the blast radius is smaller.

## When a bug is discovered

1. Pause the buggy smart contract.
2. Pause contracts that depend on the buggy smart contract.
3. Assess the impact or severity of the bug.
4. Implement a new smart contract containing a fix.
5. Write unit tests to cover the bug or edge case.
6. Perform an internal audit.
7. Send the contracts for an external audit.
8. Replace the buggy contract with the new version.

## When a private key is leaked

1. Pause the smart contracts containing the bug.
2. Pause contracts that depend on the contract.
3. Assess the impact of the leak. Not all private keys are created equal due to the roles system.
4. Identify the cause of the leak to prevent future occurrences.
5. Replace the smart contract containing the bad actor.

## Upgrading a contract

1. Pause affected smart contracts.
2. Implement and audit a new version.
3. Deploy the new smart contract.
4. Point contracts to use the new smart contract.

## Upgrading Issuer

1. Pause `Issuer` smart contract.
2. Deploy new `IssuerV2` smart contract. `IssuerV2` must implement the `IHasIssuership` interface.
3. Call `Issuer.transferIssuership()` with new `IssuerV2` contract address.
4. Use `IssuerV2` to issue new tokens.

> See `/scripts/X_upgrade_issuer.js`

## Upgrading Rewards

1. Pause `TENXToken` smart contract, because it depends on Rewards.
2. Pause `Rewards` smart contract.
3. Deploy new `RewardsV2` smart contract
4. (If situation is unrecoverable.) Call `Rewards.reclaimRewards()`. This decomissions the Rewards contract. Skip to step 6, but supply with `RewardsV2` contract address.
5. (If expected upgrade.) Call `Rewards.setRewardsNotifier()` to a new 'fan-out' `IRewardsUpdatable` contract that broadcasts token movements to both old and new Rewards contracts.
6. Call `TENXToken.setRewards()` with new 'fan-out' `IRewardsUpdatable` contract address.
7. Unpause `TENXToken`.

> See `/scripts/X_upgrade_rewards.js` for unrecoverable case.
