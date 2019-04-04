const { expectThrow, assertEvent } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator.sol');
const ERC1594 = artifacts.require('ERC1594Mock.sol');

const TEST_BYTES = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce';
const SUCCESS_RESPONSE_CODE = '0x51';
const SUCCESS_APPLICATION_CODE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('ERC1594 + BasicModerator', ([owner, recipient, sender, other]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();
    this.newModerator = await BasicModerator.new();

    // Deploys token
    this.token = await ERC1594.new(this.moderator.address, 10000);
    await this.token.mint(sender, 1000);
    await this.token.mint(recipient, 1000);
  });

  it('should start as issuable', async () => {
    const result = await this.token.isIssuable({ from: other });
    assert.equal(result, true);
  });

  it('owner should start as issuer', async () => {
    const result = await this.token.isIssuer(owner);
    assert.equal(result, true);
  });

  it('should return on canTransfer()', async () => {
    const {
      success,
      statusCode,
      applicationCode,
    } = await this.token.canTransfer(recipient, 100, TEST_BYTES, { from: sender });
    assert.equal(success, true);
    assert.equal(statusCode, SUCCESS_RESPONSE_CODE);
    assert.equal(applicationCode, SUCCESS_APPLICATION_CODE);
  });

  it('transfer should be restricted, and allowed', async () => {
    const result = await this.token.transfer(recipient, 50, { from: sender });
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: sender,
        to: recipient,
        value: 50,
      },
    }, 'A Transfer event is emitted.');
  });

  it('transferWithData should be restricted, and allowed', async () => {
    const result = await this.token.transferWithData(recipient, 50, TEST_BYTES, { from: sender });
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: sender,
        to: recipient,
        value: 50,
      },
    }, 'A Transfer event is emitted.');
  });

  it('should return on canTransferFrom()', async () => {
    const {
      success,
      statusCode,
      applicationCode,
    } = await this.token.canTransferFrom(sender, recipient, 100, TEST_BYTES);
    assert.equal(success, true);
    assert.equal(statusCode, SUCCESS_RESPONSE_CODE);
    assert.equal(applicationCode, SUCCESS_APPLICATION_CODE);
  });

  it('transferFrom should be restricted, and allowed', async () => {
    await this.token.approve(owner, 50, { from: sender });
    const result = await this.token.transferFrom(sender, recipient, 50, { from: owner });
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: sender,
        to: recipient,
        value: 50,
      },
    }, 'A Transfer event is emitted.');
  });

  it('transferFromWithDredeemFromata should be restricted, and allowed', async () => {
    await this.token.approve(owner, 50, { from: sender });
    const result = await this.token.transferFromWithData(
      sender,
      recipient,
      50,
      TEST_BYTES,
      { from: owner },
    );
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: sender,
        to: recipient,
        value: 50,
      },
    }, 'A Transfer event is emitted.');
  });

  it('issue should be restricted, and allowed', async () => {
    await this.token.approve(owner, 50, { from: sender });
    const result = await this.token.issue(
      recipient,
      25,
      TEST_BYTES,
      { from: owner },
    );
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: ZERO_ADDRESS,
        to: recipient,
        value: 25,
      },
    }, 'A Transfer event is emitted.');
    assertEvent(result, {
      event: 'Issued',
      args: {
        operator: owner,
        to: recipient,
        value: 25,
        data: TEST_BYTES,
      },
    }, 'A Issued event is emitted.', 1);
  });

  it('non-issuers should NOT be able to issue', async () => {
    await expectThrow(this.token.issue(
      recipient,
      25,
      TEST_BYTES,
      { from: other },
    ));
  });

  it('redeem is unrestricted', async () => {
    const result = await this.token.redeem(
      50,
      TEST_BYTES,
      { from: recipient },
    );
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: recipient,
        to: ZERO_ADDRESS,
        value: 50,
      },
    }, 'A Transfer event is emitted.');
    assertEvent(result, {
      event: 'Redeemed',
      args: {
        operator: recipient,
        from: recipient,
        value: 50,
        data: TEST_BYTES,
      },
    }, 'A Redeemed event is emitted.', 1); 
  });

  it('redeemFrom is unrestricted', async () => {
    await this.token.approve(owner, 50, { from: recipient });
    const result = await this.token.redeemFrom(
      recipient,
      50,
      TEST_BYTES,
      { from: owner },
    );
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: recipient,
        to: ZERO_ADDRESS,
        value: 50,
      },
    }, 'A Transfer event is emitted.');
    assertEvent(result, {
      event: 'Approval',
      args: {
        spender: owner,
        owner: recipient,
        value: 0,
      },
    }, 'A Approval event is emitted.', 1);
  });

  it('other accounts should NOT be able to set moderator address', async () => {
    await expectThrow(this.token.setModerator(
      this.moderator.address,
      { from: other },
    ));
  });

  it('owner should NOT be able to set moderator address to zero address', async () => {
    await expectThrow(this.token.setModerator(
      ZERO_ADDRESS,
      { from: owner },
    ));
  });

  it('owner should NOT be able to set moderator address to wallet address', async () => {
    await expectThrow(this.token.setModerator(
      owner,
      { from: owner },
    ));
  });

  it('owner should be able to set new moderator address', async () => {
    const result = await this.token.setModerator(
      this.newModerator.address,
      { from: owner },
    );

    assertEvent(result, {
      event: 'ModeratorUpdated',
      args: {
        moderator: this.newModerator.address,
      },
    }, 'A ModeratorUpdated event is emitted.');

    const newModerator = await this.token.moderator();
    assert.equal(newModerator, this.newModerator.address);
  });

  it('non-issuers should NOT be able to finish issuance', async () => {
    await expectThrow(this.token.finishIssuance({ from: other }));

    const status = await this.token.isIssuable({ from: other });
    assert.equal(status, true);
  });

  it('owner should be able to finish issuance', async () => {
    const result = await this.token.finishIssuance({ from: owner });
    assertEvent(result, {
      event: 'IssuanceFinished',
    }, 'A IssuanceFinished event is emitted.');

    const status = await this.token.isIssuable({ from: other });
    assert.equal(status, false);
  });

  it('issue should fail when issuance period is finished', async () => {
    await expectThrow(this.token.issue(
      recipient,
      50,
      TEST_BYTES,
      { from: owner },
    ));
  });
});
