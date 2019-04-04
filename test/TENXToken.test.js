const BN = require('bn.js');
const { assertEvent, expectThrow } = require('./helpers');

const TENXToken = artifacts.require('TENXToken');
const PAYToken = artifacts.require('PAYToken');
const Rewards = artifacts.require('Rewards');
const BasicModerator = artifacts.require('BasicModerator');

const TOTAL_SHARES = 200;
const TEST_ISSUE_AMOUNT = 50;
const TEST_TRANSFER_AMOUNT = 10;
const TEST_APPROVE_AMOUNT = 5;
const EMPTY_BYTES = '0x';

contract('TENXToken', ([owner, issuer, other, recipient, thirdPartyRecipient, zeroBalanceAccount, newIssuer]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();

    // Deploys tokens
    this.rewardableToken = await TENXToken.new(
      this.moderator.address,
      TOTAL_SHARES, // Deploy with test cap
    );
    this.rewardsToken = await PAYToken.new();

    // Deploys rewards
    this.rewards = await Rewards.new(
      this.rewardableToken.address,
      this.rewardsToken.address,
    );

    // Links token and rewards contracts
    await this.rewardableToken.setRewards(this.rewards.address, { from: owner });
  });

  it('other accounts should be able to view token name', async () => {
    const name = await this.rewardableToken.name({ from: other });
    assert.equal(name, 'TenX Token');
  });

  it('other accounts should be able to view token symbol', async () => {
    const symbol = await this.rewardableToken.symbol({ from: other });
    assert.equal(symbol, 'TENX');
  });

  it('other accounts hould be able to view token decimals', async () => {
    const decimals = await this.rewardableToken.decimals({ from: other });
    assert.equal(decimals, 18);
  });

  it('other accounts should be able to view initial totalSupply()', async () => {
    const supply = await this.rewardableToken.totalSupply({ from: other });
    assert.equal(supply.toNumber(), 0);
  });

  it('other accounts should be able to view token cap()', async () => {
    const cap = await this.rewardableToken.cap({ from: other });
    assert(cap.toNumber());
  });

  it('owner can add and remove a issuer role', async () => {
    await this.rewardableToken.addIssuer(issuer, { from: owner });
    let hasRole = await this.rewardableToken.isIssuer(issuer, { from: other });
    assert(hasRole);

    await this.rewardableToken.renounceIssuer({ from: issuer });
    hasRole = await this.rewardableToken.isIssuer(issuer, { from: other });
    assert(!hasRole);
  });

  it('issuer should NOT be able to issue() tokens beyond cap', async () => {
    const testExceedAmount = new BN('305218255948577763364408207');
    await expectThrow(this.rewardableToken.issue(recipient, testExceedAmount, EMPTY_BYTES, { from: issuer }));

    const balance = await this.rewardableToken.balanceOf(recipient, { from: other });
    assert.equal(balance.toNumber(), 0);
  });

  it('other accounts should NOT be able to issue() tokens', async () => {
    const hasRole = await this.rewardableToken.isIssuer(other, { from: other });
    assert.equal(hasRole, false);

    await expectThrow(this.rewardableToken.issue(recipient, TEST_ISSUE_AMOUNT, EMPTY_BYTES, { from: other }));

    const balance = await this.rewardableToken.balanceOf(recipient, { from: other });
    assert.equal(balance.toNumber(), 0);
  });

  it('issuer should be able to issue() tokens when under token cap', async () => {
    await this.rewardableToken.addIssuer(issuer, { from: owner });
    const hasRole = await this.rewardableToken.isIssuer(issuer, { from: other });
    assert(hasRole);

    await this.rewardableToken.issue(recipient, TEST_ISSUE_AMOUNT, EMPTY_BYTES, { from: issuer });

    const balance = await this.rewardableToken.balanceOf(recipient, { from: other });
    assert.equal(balance.toNumber(), TEST_ISSUE_AMOUNT);
  });

  it('accounts should NOT be able to transfer() tokens when balance is insufficient', async () => {
    const from = zeroBalanceAccount;
    const to = other;
    await expectThrow(this.rewardableToken.transfer(to, TEST_TRANSFER_AMOUNT, { from }));

    const balance = await this.rewardableToken.balanceOf(to, { from: other });
    assert.equal(balance.toNumber(), 0);
  });

  it('accounts should be able to transfer() tokens', async () => {
    const from = recipient;
    const to = other;
    const result = await this.rewardableToken.transfer(to, TEST_TRANSFER_AMOUNT, { from });
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from,
        to,
        value: TEST_TRANSFER_AMOUNT,
      },
    }, 'A Transfer event is emitted.');

    const balance = await this.rewardableToken.balanceOf(to, { from: other });
    assert.equal(balance.toNumber(), TEST_TRANSFER_AMOUNT);
  });

  it('accounts should be able to approve() allowances', async () => {
    const tokenOwner = recipient;
    const spender = other;
    const result = await this.rewardableToken.approve(
      spender,
      TEST_APPROVE_AMOUNT,
      { from: tokenOwner },
    );
    assertEvent(result, {
      event: 'Approval',
      args: {
        owner: tokenOwner,
        spender,
        value: TEST_APPROVE_AMOUNT,
      },
    }, 'An Approval event is emitted.');

    const allowance = await this.rewardableToken.allowance(tokenOwner, spender, { from: other });
    assert.equal(allowance.toNumber(), TEST_APPROVE_AMOUNT);
  });

  it('accounts should be able to transferFrom() after approval', async () => {
    const tokenOwner = recipient;
    const spender = other;
    const result = await this.rewardableToken.transferFrom(
      tokenOwner,
      thirdPartyRecipient,
      TEST_APPROVE_AMOUNT,
      { from: spender },
    );
    assertEvent(result, {
      event: 'Transfer',
      args: {
        from: tokenOwner,
        to: thirdPartyRecipient,
        value: TEST_APPROVE_AMOUNT,
      },
    }, 'A Transfer event is emitted.');
  });

  it('non-pausers cannot pause', async () => {
    const isPauser = await this.rewardableToken.isPauser(other);
    assert.equal(isPauser, false);

    await expectThrow(this.rewardableToken.pause({ from: other }));
  });

  it('pausers can pause', async () => {
    const isPauser = await this.rewardableToken.isPauser(owner);
    assert.equal(isPauser, true);

    const result = await this.rewardableToken.pause({ from: owner });
    assertEvent(result, {
      event: 'Paused',
      args: {
        account: owner,
      },
    }, 'A Paused event is emitted.');

    const isPaused = await this.rewardableToken.paused();
    assert.equal(isPaused, true);
  });

  it('transfers are pausable', async () => {
    const from = recipient;
    const to = other;
    await expectThrow(this.rewardableToken.transfer(to, TEST_TRANSFER_AMOUNT, { from }));
  });

  it('transferFroms are pausable', async () => {
    await this.rewardableToken.approve(other, 10, { from: recipient })
    await expectThrow(this.rewardableToken.transferFrom(recipient, other, 10, { from: other }));
  });

  it('issue() is pausable', async () => {
    await expectThrow(this.rewardableToken.issue(
      recipient,
      TEST_ISSUE_AMOUNT,
      EMPTY_BYTES,
      { from: issuer },
    ));
  });

  it('redeem() is pausable', async () => {
    await expectThrow(this.rewardableToken.issue(
      recipient,
      TEST_ISSUE_AMOUNT,
      EMPTY_BYTES,
      { from: issuer },
    ));
  });

  it('redeemFrom() is pausable', async () => {
    await this.rewardableToken.approve(other, 10, { from: recipient });
    await expectThrow(this.rewardableToken.redeemFrom(recipient, 10, EMPTY_BYTES, { from: other }));
  });

  it('non-pausers cannot unpause', async () => {
    await expectThrow(this.rewardableToken.unpause({ from: other }));
  });

  it('pausers can unpause', async () => {
    const isPauser = await this.rewardableToken.isPauser(owner);
    assert.equal(isPauser, true);

    const result = await this.rewardableToken.unpause({ from: owner });
    assertEvent(result, {
      event: 'Unpaused',
      args: {
        account: owner,
      },
    }, 'A Unpaused event is emitted.');

    const isPaused = await this.rewardableToken.paused();
    assert.equal(isPaused, false);
  });

  it('issuer can transferIssuership', async () => {
    const newIssuerIsIssuer = await this.rewardableToken.isIssuer(newIssuer);
    assert.equal(newIssuerIsIssuer, false);

    const ownerIsIssuer = await this.rewardableToken.isIssuer(owner);
    assert.equal(ownerIsIssuer, true);

    const result = await this.rewardableToken.transferIssuership(newIssuer, { from: owner });
    assertEvent(result, {
      event: 'IssuerAdded',
      args: {
        account: newIssuer,
      },
    }, 'A IssuerAdded event is emitted.');
    assertEvent(result, {
      event: 'IssuerRemoved',
      args: {
        account: owner,
      },
    }, 'A IssuerRemoved event is emitted.', 1);        
    assertEvent(result, {
      event: 'IssuershipTransferred',
      args: {
        from: owner,
        to: newIssuer,
      },
    }, 'A IssuershipTransferred event is emitted.', 2);

    const nextIssuerisIssuer = await this.rewardableToken.isIssuer(newIssuer)
    assert.equal(nextIssuerisIssuer, true);

    const nextOwnerIsIssuer = await this.rewardableToken.isIssuer(owner);
    assert.equal(nextOwnerIsIssuer, false);
  });

  it('non-issuers should NOT be able to issue', async () => {
    const ownerIsIssuer = await this.rewardableToken.isIssuer(owner);
    assert.equal(ownerIsIssuer, false);

    await expectThrow(this.rewardableToken.issue(other, 100, EMPTY_BYTES, { from: owner }));
  });
});
