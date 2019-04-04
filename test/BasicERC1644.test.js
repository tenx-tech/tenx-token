const { assertEvent, expectThrow } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator.sol');
const ERC1644 = artifacts.require('ERC1644Mock.sol');

const testBytes = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce'; // bytes
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('ERC1644', ([owner, A, B, stranger]) => {
  before(async () => {
    this.moderator = await BasicModerator.new();
    this.token = await ERC1644.new(this.moderator.address, 1000);

    // Test scenario setup
    await this.token.mint(A, 100);
  });

  it('should initialize correctly', async () => {
    const isController = await this.token.isController(owner);
    assert.equal(isController, true);

    const isControllable = await this.token.isControllable();
    assert.equal(isControllable, true);
  });

  it('non-controllers should NOT be able to controllerTransfer', async () => {
    await expectThrow(this.token.controllerTransfer(
      A,
      B,
      50,
      testBytes,
      testBytes,
      { from: stranger },
    ));
  });

  it('controllers should be able to controllerTransfer', async () => {
    const result = await this.token.controllerTransfer(
      A,
      B,
      50,
      testBytes,
      testBytes,
      { from: owner },
    );
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: A,
        to: B,
        value: 50,
      },
    }, 'A Transfer event is emitted.', 0);
    assertEvent(result, {
      event: 'ControllerTransfer',
      args: {
        controller: owner,
        from: A,
        to: B,
        value: 50,
        data: testBytes,
        operatorData: testBytes,
      },
    }, 'A ControllerTransfer event is emitted.', 1);

    const aBalance = await this.token.balanceOf(A);
    assert.equal(aBalance, 50);

    const bBalance = await this.token.balanceOf(B);
    assert.equal(bBalance, 50);
  });

  it('non-controllers should NOT be able to controllerRedeem', async () => {
    await expectThrow(this.token.controllerRedeem(
      A,
      50,
      testBytes,
      testBytes,
      { from: stranger },
    ));
  });

  it('controllers should be able to controllerRedeem', async () => {
    const result = await this.token.controllerRedeem(
      A,
      50,
      testBytes,
      testBytes,
      { from: owner },
    );
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: A,
        to: ZERO_ADDRESS,
        value: 50,
      },
    }, 'A Transfer event is emitted.', 0);
    assertEvent(result, {
      event: 'ControllerRedemption',
      args: {
        controller: owner,
        tokenHolder: A,
        value: 50,
        data: testBytes,
        operatorData: testBytes,
      },
    }, 'A ControllerRedemption event is emitted.', 1);

    const aBalance = await this.token.balanceOf(A);
    assert.equal(aBalance, 0);
  });
});
