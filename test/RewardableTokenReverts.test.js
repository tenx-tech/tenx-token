const { expectThrow } = require('./helpers');

const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYTokenMock');
const Rewards = artifacts.require('Rewards');
const PermissionedModerator = artifacts.require('PermissionedModerator');

const TOTAL_SHARES = 200;
const FIRST_DEPOSIT_AMOUNT = 100;
const FAR_FUTURE_DATE = Math.round(Date.now() / 1000) + 100000;
const EMPTY_BYTES = '0x';

// This test suite handles cases where an external call fails, and state should be reverted
contract('RewardableToken Rewards Edge Cases', ([owner, issuer, A, B, other, rewardsSource]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await PermissionedModerator.new();
    const isModerator = await this.moderator.isModerator(owner);
    assert.equal(isModerator, true);

    // Deploys tokens
    this.rewardableToken = await RewardableToken.new(this.moderator.address, TOTAL_SHARES);
    this.rewardsToken = await PAYToken.new();

    // Deploys rewards
    this.rewards = await Rewards.new(
      this.rewardableToken.address,
      this.rewardsToken.address,
    );
    await this.rewards.whitelist(A);

    // Links token and rewards contracts
    await this.rewardableToken.setRewards(this.rewards.address, { from: owner });

    // Test scenario setup: grant send and receive permissions to A and B.
    await this.rewardableToken.addIssuer(issuer, { from: owner });
    await this.moderator.setPermission(
      A,
      true,
      0,
      true,
      0,
      FAR_FUTURE_DATE,
      { from: owner },
    );
    await this.rewardableToken.issue(A, 50, EMPTY_BYTES, { from: issuer });
    await this.moderator.setPermission(
      B,
      true,
      0,
      true,
      0,
      FAR_FUTURE_DATE,
      { from: owner },
    );
    await this.rewardableToken.issue(B, 50, EMPTY_BYTES, { from: issuer });

    // Top up global rewards supply
    await this.rewardsToken.mint(rewardsSource, 10000);
    await this.rewardsToken.approve(this.rewards.address, 10000, { from: rewardsSource });
    await this.rewards.addRewarder(rewardsSource);
    await this.rewards.deposit(FIRST_DEPOSIT_AMOUNT, { from: rewardsSource });
  });

  it('make sure test scenario is correct', async () => {
    // User A and B should have rewards 25 each
    const totalRewards = await this.rewards.totalRewards({ from: other });
    assert.equal(totalRewards.toNumber(), FIRST_DEPOSIT_AMOUNT);

    const ARewards = await this.rewards.unclaimedRewards(A, { from: other });
    assert.equal(ARewards.toNumber(), 25);

    const BRewards = await this.rewards.unclaimedRewards(B, { from: other });
    assert.equal(BRewards.toNumber(), 25);
  });

  it('if an TENX transfer fails, user dampings & reward balances should remain unchanged', async () => {
    await this.moderator.setPermission(
      B,
      true,
      0,
      false,
      0,
      FAR_FUTURE_DATE,
      { from: owner },
    ); // Disallow B from receiving transfers.

    await expectThrow(this.rewardableToken.transfer(B, 10, { from: A }));

    const ARewards = await this.rewards.unclaimedRewards(A, { from: other });
    assert.equal(ARewards.toNumber(), 25);

    const BRewards = await this.rewards.unclaimedRewards(B, { from: other });
    assert.equal(BRewards.toNumber(), 25);
  });

  it('if a rewards withdrawal fails, _claimedRewards should remain unchanged', async () => {
    const claimedRewards = await this.rewards.claimedRewards(A, { from: other });
    assert.equal(claimedRewards.toNumber(), 0);

    // Fails because we use PAYTokenMock.transfer()
    await expectThrow(this.rewards.withdraw({ from: A }));

    const nextClaimedRewards = await this.rewards.claimedRewards(A, { from: other });
    assert.equal(nextClaimedRewards.toNumber(), 0);
  });
});
