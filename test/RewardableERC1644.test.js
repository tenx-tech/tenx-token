const { assertEvent } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator');
const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYToken');
const Rewards = artifacts.require('Rewards');

const TOTAL_SHARES = 200;
const DEPOSIT_AMOUNT = 200;
const TEST_BYTES = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('RewardableToken with ERC1644', ([owner, controller, A, B, rewardsSource]) => {
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

    // Links token and rewards contracts
    await this.rewardableToken.setRewards(this.rewards.address, { from: owner });

    // Set up test scenario
    await this.rewardableToken.issue(A, 100, TEST_BYTES);

    await this.rewardsToken.mint(rewardsSource, 10000, { from: owner });
    await this.rewardsToken.approve(this.rewards.address, 10000, { from: rewardsSource });
    await this.rewards.addRewarder(rewardsSource);
    await this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource });
  });

  it('should initialize correctly', async () => {
    const isController = await this.rewardableToken.isController(owner);
    assert.equal(isController, true);

    const totalShares = await this.rewards.totalShares();
    assert.equal(totalShares, 200);

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance, 100);

    const aRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aRewards, 100);
  });

  it('should be able to add controller', async () => {
    const result = await this.rewardableToken.addController(controller, { from: owner });
    assertEvent(result, {
      event: 'ControllerAdded',
      args: {
        account: controller,
      },
    }, 'A ControllerAdded event is emitted.');

    const isController = await this.rewardableToken.isController(controller);
    assert.equal(isController, true);
  });

  it('controller should be able to controllerTransfer', async () => {
    const result = await this.rewardableToken.controllerTransfer(
      A,
      B,
      100,
      TEST_BYTES,
      TEST_BYTES,
      { from: owner },
    );
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: A,
        to: B,
        value: 100,
      },
    }, 'A Transfer event is emitted.', 0);
    assertEvent(result, {
      event: 'ControllerTransfer',
      args: {
        controller: owner,
        from: A,
        to: B,
        value: 100,
        data: TEST_BYTES,
        operatorData: TEST_BYTES,
      },
    }, 'A ControllerTransfer event is emitted.', 1);

    // New balances after transfer should be correct
    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance, 0);
    const bBalance = await this.rewardableToken.balanceOf(B);
    assert.equal(bBalance, 100);

    // Rewards should still be consistent:
    // B should have none and A should have 50% of DEPOSIT_AMOUNT
    const aRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aRewards.toNumber(), 100);
    const bRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(bRewards.toNumber(), 0); 
  });

  it('controller should be able to controllerRedeem', async () => {
    const result = await this.rewardableToken.controllerRedeem(
      B,
      100,
      TEST_BYTES,
      TEST_BYTES,
      { from: owner },
    );
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: B,
        to: ZERO_ADDRESS,
        value: 100,
      },
    }, 'A Transfer event is emitted.', 0);
    assertEvent(result, {
      event: 'ControllerRedemption',
      args: {
        controller: owner,
        tokenHolder: B,
        value: 100,
        data: TEST_BYTES,
        operatorData: TEST_BYTES,
      },
    }, 'A ControllerRedemption event is emitted.', 1);

    const totalShares = await this.rewards.totalShares();
    assert.equal(totalShares, 100);

    // New balances after burn should be correct
    const bBalance = await this.rewardableToken.balanceOf(B);
    assert.equal(bBalance, 0);

    // Rewards should still be consistent:
    // B should have none
    const bRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(bRewards.toNumber(), 0);
  });
});
