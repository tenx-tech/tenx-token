const { assertEvent, expectThrow } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator');
const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYToken');
const Rewards = artifacts.require('Rewards');

const TOTAL_SHARES = 200;
const TOTAL_INITIAL_MINTED_AMOUNT = 100;
const FIRST_DEPOSIT_AMOUNT = 100;
const SECOND_DEPOSIT_AMOUNT = 100;
const SUPPLY_AMOUNT = 150;
const WITHDRAW_AMOUNT = 10;
const EMPTY_BYTES = '0x';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('RewardableToken', ([owner, issuer, A, B, C, other, rewardsSource]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();

    // Deploys tokens
    this.rewardableToken = await RewardableToken.new(this.moderator.address, TOTAL_SHARES);
    this.rewardsToken = await PAYToken.new();

    // Deploys rewards
    this.rewards = await Rewards.new(
      this.rewardableToken.address,
      this.rewardsToken.address,
    );
    await this.rewards.whitelist(A); // Allow A to withdraw rewards

    // Links token and rewards contracts
    await this.rewardableToken.setRewards(this.rewards.address, { from: owner });

    // Test scenario setup
    await this.rewardsToken.mint(rewardsSource, 10000);
    await this.rewardsToken.approve(this.rewards.address, 200, { from: rewardsSource });

    await this.rewardableToken.addIssuer(issuer, { from: owner });
    await this.rewardableToken.issue(A, TOTAL_INITIAL_MINTED_AMOUNT / 2, EMPTY_BYTES, { from: issuer });
    await this.rewardableToken.issue(B, TOTAL_INITIAL_MINTED_AMOUNT / 2, EMPTY_BYTES, { from: issuer });

    // Test upgrades
    this.newRewards = await Rewards.new(
      this.rewardableToken.address,
      this.rewardsToken.address,
    );
  });

  it('initializes correctly', async () => {
    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance, 50); // A has 50 TENX

    const bBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(bBalance, 50); // B has 50 TENX
  });

  it('owner should be able to add rewarder', async () => {
    await this.rewards.addRewarder(rewardsSource, { from: owner });
    const hasRole = await this.rewards.isRewarder(rewardsSource, { from: other });
    assert.equal(hasRole, true);
  });  

  it('should be able to view token cap', async () => {
    const cap = await this.rewardableToken.cap({ from: other });
    assert.equal(cap, TOTAL_SHARES);
  });

  it('should be able to view total token minted', async () => {
    const totalMinted = await this.rewardableToken.totalMinted({ from: other });
    assert.equal(totalMinted, TOTAL_INITIAL_MINTED_AMOUNT);
  });  

  it('owner can add and remove an issuer role', async () => {
    await this.rewardableToken.renounceIssuer({ from: issuer });
    let hasRole = await this.rewardableToken.isIssuer(issuer, { from: other });
    assert(!hasRole);

    await this.rewardableToken.addIssuer(issuer, { from: owner });
    hasRole = await this.rewardableToken.isIssuer(issuer, { from: other });
    assert(hasRole);
  });

  it('issuer should NOT be able to issue() tokens beyond cap', async () => {
    const testExceedAmount = 1000;
    await expectThrow(this.rewardableToken.issue(other, testExceedAmount, EMPTY_BYTES, { from: issuer }));

    const balance = await this.rewardableToken.balanceOf(other, { from: other });
    assert.equal(balance.toNumber(), 0);

    const totalMinted = await this.rewardableToken.totalMinted({ from: other });
    assert.equal(totalMinted, TOTAL_INITIAL_MINTED_AMOUNT);
  });

  it('other accounts should be able to view rewards contract', async () => {
    const address = await this.rewardableToken.rewards({ from: other });
    assert.equal(address, this.rewards.address);
  });

  it('other accounts should NOT be able to setRewards', async () => {
    await expectThrow(this.rewardableToken.setRewards(this.rewards.address, { from: other }));
  });

  it('other accounts should be able to view initial total reward', async () => {
    const totalRewards = await this.rewards.totalRewards({ from: other });
    assert.equal(totalRewards.toNumber(), 0);
  });

  it('other accounts should be able to view initial reward supply', async () => {
    const rewardsSupply = await this.rewards.supply({ from: other });
    assert.equal(rewardsSupply.toNumber(), 0);
  });

  it('other accounts should be able to view initial user rewards', async () => {
    const ARewards = await this.rewards.unclaimedRewards(A, { from: other });
    assert.equal(ARewards.toNumber(), 0);

    const BRewards = await this.rewards.unclaimedRewards(B, { from: other });
    assert.equal(BRewards.toNumber(), 0);
  });

  it('other accounts should NOT be able to withdraw if total user rewards is 0', async () => {
    await expectThrow(this.rewards.withdraw({ from: A }));
  });

  it('other should NOT be able to deposit', async () => {
    await expectThrow(this.rewards.deposit(FIRST_DEPOSIT_AMOUNT, { from: other }));
  });

  it('owner should be able to deposit, and the reward is calculated correctly for each shareholder', async () => {
    const result = await this.rewards.deposit(FIRST_DEPOSIT_AMOUNT, { from: rewardsSource });
    assertEvent(result, {
      event: 'Deposited',
      args: {
        from: rewardsSource,
        amount: FIRST_DEPOSIT_AMOUNT,
      },
    }, 'A Deposited event is emitted.');

    const totalRewards = await this.rewards.totalRewards({ from: other });
    assert.equal(totalRewards.toNumber(), FIRST_DEPOSIT_AMOUNT);

    const ARewards = await this.rewards.unclaimedRewards(A, { from: other });
    assert.equal(ARewards.toNumber(), 25);

    const BRewards = await this.rewards.unclaimedRewards(B, { from: other });
    assert.equal(BRewards.toNumber(), 25);
  });

  it('A should be able to transfer to C, and the total rewards remains consistent', async () => {
    await this.rewardableToken.transfer(C, 25, { from: A });

    const ARewards = await this.rewards.unclaimedRewards(A, { from: other });
    // (25 * 100 / 200) + 12 = 12 + 12 = 24
    assert.equal(ARewards.toNumber(), 24); // instead of 25, because of rounding down

    const BRewards = await this.rewards.unclaimedRewards(B, { from: other });
    // (50 * 100 / 200) + 0 = 25
    assert.equal(BRewards.toNumber(), 25);

    const CRewards = await this.rewards.unclaimedRewards(C, { from: other });
    // (25 * 100 / 200) + (-12) = 0
    assert.equal(CRewards.toNumber(), 0);
  });

  it('C should be able to transfer back to A, and the total rewards remains consistent', async () => {
    await this.rewardableToken.transfer(A, 25, { from: C });

    const ARewards = await this.rewards.unclaimedRewards(A, { from: other });
    assert.equal(ARewards.toNumber(), 25);

    const BRewards = await this.rewards.unclaimedRewards(B, { from: other });
    assert.equal(BRewards.toNumber(), 25);

    const CRewards = await this.rewards.unclaimedRewards(C, { from: other });
    assert.equal(CRewards.toNumber(), 0);
  });

  it('issuing to C should not change total rewards for A and B', async () => {
    await this.rewardableToken.issue(C, 25, EMPTY_BYTES, { from: issuer });

    const ARewards = await this.rewards.unclaimedRewards(A, { from: other });
    assert.equal(ARewards.toNumber(), 25); // A has 50 shares

    const BRewards = await this.rewards.unclaimedRewards(B, { from: other });
    assert.equal(BRewards.toNumber(), 25); // B has 50 shares

    const CRewards = await this.rewards.unclaimedRewards(C, { from: other });
    assert.equal(CRewards.toNumber(), 12); // C has 25 shares
  });

  it('second deposit results in rewards for A, B, and C', async () => {
    await this.rewards.deposit(SECOND_DEPOSIT_AMOUNT, { from: rewardsSource });

    const ARewards = await this.rewards.unclaimedRewards(A, { from: other });
    assert.equal(ARewards.toNumber(), 50);

    const BRewards = await this.rewards.unclaimedRewards(B, { from: other });
    assert.equal(BRewards.toNumber(), 50);

    const CRewards = await this.rewards.unclaimedRewards(C, { from: other });
    assert.equal(CRewards.toNumber(), 25);
  });

  it('payee should be able to top up reward supply', async () => {
    const oldRewardsAllowance = await this.rewardsToken.allowance(
      rewardsSource,
      this.rewards.address,
      { from: other },
    );
    assert.equal(oldRewardsAllowance.toNumber(), 0);

    const result = await this.rewardsToken.approve(
      this.rewards.address,
      SUPPLY_AMOUNT,
      { from: rewardsSource },
    );
    assertEvent(result, {
      event: 'Approval',
      args: {
        owner: rewardsSource,
        spender: this.rewards.address,
        value: SUPPLY_AMOUNT,
      },
    }, 'A Withdrawn event is emitted.');

    const rewardsAllowance = await this.rewardsToken.allowance(
      rewardsSource,
      this.rewards.address,
      { from: other },
    );
    assert.equal(rewardsAllowance.toNumber(), SUPPLY_AMOUNT);
  });

  it('payee should be able to withdraw rewards if user reward > 0 and rewards contract has enough supply', async () => {
    const previousClaimedRewards = await this.rewards.claimedRewards(A);
    assert.equal(previousClaimedRewards.toNumber(), 0);

    const previousUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(previousUnclaimedRewards.toNumber(), 50);

    const previousBalance = await this.rewardsToken.balanceOf(A);
    assert.equal(previousBalance.toNumber(), 0);

    const withdrawAmount = previousUnclaimedRewards.toNumber();
    const result = await this.rewards.withdraw({ from: A });
    assertEvent(result, {
      event: 'Withdrawn',
      args: {
        from: A,
        amount: withdrawAmount,
      },
    }, 'A Withdrawn event is emitted.');

    const nextClaimedRewards = await this.rewards.claimedRewards(A);
    assert.equal(nextClaimedRewards.toNumber(), withdrawAmount);

    const nextUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(nextUnclaimedRewards.toNumber(), 50 - withdrawAmount);

    const nextBalance = await this.rewardsToken.balanceOf(A);
    assert.equal(nextBalance.toNumber(), withdrawAmount);
  });

  it('payee whould NOT be able to withdraw when not whitelisted', async () => {
    await this.rewards.unwhitelist(A);

    await expectThrow(this.rewards.withdraw({ from: A }));

    await this.rewards.whitelist(A);
  });

  it('payee should NOT be able to withdraw when unclaimed rewards is zero', async () => {
    const previousClaimedRewards = await this.rewards.claimedRewards(A);
    assert.equal(previousClaimedRewards.toNumber(), 50);

    const previousUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(previousUnclaimedRewards.toNumber(), 0);

    await expectThrow(this.rewards.withdraw({ from: A }));

    const nextClaimedRewards = await this.rewards.claimedRewards(A);
    assert.equal(nextClaimedRewards, 50); // Unchanged

    const nextUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(nextUnclaimedRewards, 0); // Unchanged
  });

  it('owner should be able to pause Rewards', async () => {
    await this.rewards.pause({ from: owner });
    const isPaused = await this.rewards.paused();
    assert.equal(isPaused, true);
  });

  it('rewarder should NOT be able to deposit when Rewards is paused', async () => {
    await expectThrow(this.rewards.deposit(100, { from: rewardsSource }));
  });

  it('rewarder should NOT be able to deposit when paused', async () => {
    await expectThrow(this.rewards.deposit(FIRST_DEPOSIT_AMOUNT, { from: rewardsSource }));
  });

  it('users should NOT be able to withdraw when paused', async () => {
    await expectThrow(this.rewards.withdraw({ from: A }));
  });

  it('owner should be able to unpause Rewards', async () => {
    await this.rewards.unpause({ from: owner });
    const isPaused = await this.rewards.paused();
    assert.equal(isPaused, false);
  });

  it('owner should be a rewarder', async () => {
    const hasRole = await this.rewards.isRewarder(owner, { from: other });
    assert.equal(hasRole, true);
  });

  it('rewarder should be able to call deposit', async () => {
    const result = await this.rewards.deposit(FIRST_DEPOSIT_AMOUNT, { from: rewardsSource });
    assertEvent(result, {
      event: 'Deposited',
      args: {
        from: rewardsSource,
        amount: FIRST_DEPOSIT_AMOUNT,
      },
    }, 'A Deposited event is emitted.');
  });

  it('rewarder should be able to remove self', async () => {
    await this.rewards.renounceRewarder({ from: rewardsSource });
    const hasRole = await this.rewards.isRewarder(rewardsSource, { from: other });
    assert.equal(hasRole, false);
  });

  it('owner should NOT be able to set Rewards address to zero address', async () => {
    await expectThrow(this.rewardableToken.setRewards(
      ZERO_ADDRESS,
      { from: owner },
    ));
  });

  it('owner should NOT be able to set Rewards address to wallet address', async () => {
    await expectThrow(this.rewardableToken.setRewards(
      owner,
      { from: owner },
    ));
  });

  it('owner should be able to set new rewards address', async () => {
    const result = await this.rewardableToken.setRewards(
      this.newRewards.address,
      { from: owner },
    );

    assertEvent(result, {
      event: 'RewardsUpdated',
      args: {
        implementation: this.newRewards.address,
      },
    }, 'A RewardsUpdated event is emitted.');

    const newRewards = await this.rewardableToken.rewards();
    assert.equal(newRewards, this.newRewards.address);
  });
});
