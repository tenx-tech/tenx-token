const { assertEvent, expectThrow } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator');
const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYToken');
const IERC20 = artifacts.require('IERC20');
const Rewards = artifacts.require('Rewards');

const TOTAL_SHARES = 200;
const DEPOSIT_AMOUNT = 100;
const TEST_BYTES = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce'; // bytes

contract('Rewards', ([owner, A, B, other, rewardsSource]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();

    // Deploys tokens
    this.rewardableToken = await RewardableToken.new(this.moderator.address, TOTAL_SHARES);
    this.payToken = await PAYToken.new();
    this.rewardsToken = await IERC20.at(this.payToken.address);

    // Deploys rewards
    this.rewards = await Rewards.new(
      this.rewardableToken.address,
      this.rewardsToken.address,
    );
    await this.rewards.whitelist(A);

    // Deploy mock rewards V2
    this.newNotifier = await PAYToken.new(); // Any random contract

    // Links token and rewards contracts
    await this.rewardableToken.setRewards(this.rewards.address, { from: owner });

    // Top up rewardsSource balance
    await this.payToken.mint(rewardsSource, 10000);
    await this.rewards.addRewarder(rewardsSource);

    // Set up test scenario
    await this.rewardableToken.issue(A, 100, TEST_BYTES);
    await this.rewardableToken.issue(B, 100, TEST_BYTES);
  });

  it('should initialize correctly', async () => {
    const isRewarder = await this.rewards.isRewarder(owner);
    assert.equal(isRewarder, true);

    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards.toNumber(), 0);

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards.toNumber(), 0);

    const BRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(BRewards.toNumber(), 0);

    const isRunning = await this.rewards.isRunning();
    assert.equal(isRunning, true);
  });

  it('rewarder should NOT be able to deposit with insufficient allowance from rewardsSource', async () => {
    await expectThrow(this.rewards.deposit(DEPOSIT_AMOUNT, { from: owner }));
  });

  it('rewarder should be able to deposit with sufficient allowance from rewardsSource', async () => {
    await this.rewardsToken.approve(this.rewards.address, 10000, { from: rewardsSource });
    const result = await this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource });
    assertEvent(result, {
      event: 'Deposited',
      args: {
        from: rewardsSource,
        amount: DEPOSIT_AMOUNT,
      },
    }, 'A Deposited event is emitted.');

    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards.toNumber(), DEPOSIT_AMOUNT);

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards.toNumber(), 50);

    const BRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(BRewards.toNumber(), 50);
  });

  it('anyone other than the rewardable token contract CANNOT update damping', async () => {
    await expectThrow(this.rewards.updateOnTransfer(
      A,
      B,
      100,
      { from: other },
    ));
  });

  it('users should be able to withdraw their rewards', async () => {
    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards.toNumber(), 50);

    const result = await this.rewards.withdraw({ from: A });
    assertEvent(result, {
      event: 'Withdrawn',
      args: {
        from: A,
        amount: ARewards.toNumber(),
      },
    }, 'A Withdrawn event is emitted.');

    const aUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aUnclaimedRewards.toNumber(), 0); // should zero out balance
  });

  it('users should be able to withdraw by transferring 0 ETH', async () => {
    await this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource });

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards.toNumber(), 50);

    await this.rewards.send(0, { from: A}) // Send 0 ether, should behave the same as withdraw()

    const aUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aUnclaimedRewards.toNumber(), 0);
  });

  it('payee whould NOT be able to withdraw when not whitelisted', async () => {
    await this.rewards.unwhitelist(A);

    await expectThrow(this.rewards.withdraw({ from: A }));

    const aUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aUnclaimedRewards.toNumber(), 0); // Unchanged

    await this.rewards.whitelist(A);
  });

  it('non-owners should NOT be able to set rewards notifier', async () => {
    await expectThrow(this.rewards.setRewardsNotifier(this.newNotifier.address, { from: other }));
  });

  it('non-owners should NOT be able to reclaim tokens', async () => {
    await expectThrow(this.rewards.reclaimRewards({ from: other }));
  });

  it('owners should be able to set rewards notifier', async () => {
    const result = await this.rewards.setRewardsNotifier(this.newNotifier.address, { from: owner });
    assertEvent(result, {
      event: 'NotifierUpdated',
      args: {
        implementation: this.newNotifier.address,
      },
    }, 'A NotifierUpdated event is emitted.');  
  });

  it('owners should be able to reclaim tokens', async () => {
    const rewardsSupply = await this.rewards.supply();
    const result = await this.rewards.reclaimRewards({ from: owner });
    assertEvent(result, {
      event: 'Reclaimed',
      args: {
        amount: rewardsSupply.toNumber(),
      },
    }, 'A Reclaimed event is emitted.');

    const newTotalRewards = await this.rewards.totalRewards(); // Is monotonically increasing
    assert.equal(newTotalRewards.toNumber(), (DEPOSIT_AMOUNT*2)); // Unchanged, for historical purposes

    const newSupply = await this.rewards.supply();
    assert.equal(newSupply, 0);

    const isRunning = await this.rewards.isRunning();
    assert.equal(isRunning, false);
  });

  it('deposits should fail when the Rewards contract is no longer running', async () => {
    await expectThrow(this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource }));
  });

  it('withdraws should fail when the Rewards contract is no longer running', async () => {
    await expectThrow(this.rewards.withdraw({ from: A }));
  });
});
