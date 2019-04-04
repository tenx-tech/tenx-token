const { assertEvent, expectThrow } = require('./helpers');

const Issuer = artifacts.require('Issuer');
const ERC1594 = artifacts.require('ERC1594Mock.sol');
const PAYToken = artifacts.require('PAYToken');
const BasicModerator = artifacts.require('BasicModerator.sol');
const ClaimState = { // Enums are not yet supported by the ABI: https://github.com/ethereum/solidity/issues/1602
  NONE: 0,
  ISSUED: 1,
  CLAIMED: 2,
};
const TEST_VALUE = 55;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';


contract('Issuer', ([owner, issuerRole, payee, other, newIssuer]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();

    // Deploys token
    this.rewardableToken = await ERC1594.new(this.moderator.address, 0);

    // Deploys issuer
    this.issuer = await Issuer.new(this.rewardableToken.address);

    // Links token contract and issuer
    await this.rewardableToken.transferIssuership(this.issuer.address, { from: owner });

    const ownerIsIssuer = await this.rewardableToken.isIssuer(owner);
    assert.equal(ownerIsIssuer, false); // Issuership is transferred

    const issuerContractIsIssuer = await this.rewardableToken.isIssuer(this.issuer.address);
    assert.equal(issuerContractIsIssuer, true);

    // Deploys PAY token for reclaim scenario
    this.rewardsToken = await PAYToken.new();
  });

  it('other accounts should be able to view a claim', async () => {
    const { status, amount, issuer } = await this.issuer.claims(payee, { from: other });
    assert.equal(amount.toNumber(), 0);
    assert.equal(status, ClaimState.NONE, 'Claim starts as verified.');
    assert.equal(issuer, ZERO_ADDRESS);
  });

  it('non-issuerRoles / non-owners other accounts should NOT be able to issue a claim', async () => {
    await expectThrow(this.issuer.issue(payee, TEST_VALUE, { from: payee }));

    const { status, amount, issuer } = await this.issuer.claims(payee, { from: other });
    assert.equal(amount.toNumber(), 0);
    assert.equal(status, ClaimState.NONE, 'Claim should still be pending.');
    assert.equal(issuer, ZERO_ADDRESS);
  });

  it('owner should be an issuerRole', async () => {
    const hasRole = await this.issuer.isIssuerStaff(owner, { from: other });
    assert.equal(hasRole, true);
  });

  it('owner should be able to add issuerRole', async () => {
    await this.issuer.addIssuerStaff(issuerRole, { from: owner });
    const hasRole = await this.issuer.isIssuerStaff(issuerRole, { from: other });
    assert.equal(hasRole, true);
  });

  it('issuerRole should NOT be able to issue a claim for the zero address', async () => {
    await expectThrow(this.issuer.issue(ZERO_ADDRESS, TEST_VALUE, { from: issuerRole }));
  });

  it('issuerRole should NOT be able to issue a claim with a zero amount', async () => {
    await expectThrow(this.issuer.issue(payee, 0, { from: issuerRole }));
  });

  it('owner should be able to pause Issuer', async () => {
    await this.issuer.pause({ from: owner });
    const isPaused = await this.issuer.paused();
    assert.equal(isPaused, true);
  });

  it('issuerRole should NOT be able to issue a claim when Issuer is paused', async () => {
    await expectThrow(this.issuer.issue(payee, TEST_VALUE, { from: issuerRole }));
  });

  it('owner should be able to unpause Issuer', async () => {
    await this.issuer.unpause({ from: owner });
    const isPaused = await this.issuer.paused();
    assert.equal(isPaused, false);
  });

  it('issuerRole should NOT be able to issue for themselves', async () => {
    await expectThrow(this.issuer.issue(issuerRole, TEST_VALUE, { from: issuerRole }));
  });

  it('issuerRole should be able to issue a claim when Issuer is unpaused', async () => {
    const result = await this.issuer.issue(payee, TEST_VALUE, { from: issuerRole });
    assertEvent(result, {
      event: 'Issued',
      args: {
        payee,
        issuer: issuerRole,
        amount: TEST_VALUE,
      },
    }, 'A Issued event is emitted.');

    const { status, amount, issuer } = await this.issuer.claims(payee, { from: other });
    assert.equal(amount.toNumber(), TEST_VALUE);
    assert.equal(status, ClaimState.ISSUED, 'Claim should be marked as issued.');
    assert.equal(issuer, issuerRole);
  });

  it('payee should NOT be able to redeem a claim when Issuer is paused', async () => {
    await this.issuer.pause({ from: owner });
    await expectThrow(this.issuer.claim({ from: payee }));
    await this.issuer.unpause({ from: owner });
  });

  it('payee should be able to redeem a claim when unpaused', async () => {
    const paused = await this.issuer.paused();
    assert.equal(paused, false);

    const isIssuable = await this.rewardableToken.isIssuable();
    assert.equal(isIssuable, true);

    const result = await this.issuer.claim({ from: payee });

    assertEvent(result, {
      event: 'Claimed',
      args: {
        payee,
        amount: TEST_VALUE,
      },
    }, 'A Claimed event is emitted.');

    const { status, amount, issuer } = await this.issuer.claims(payee, { from: payee });
    assert.equal(amount.toNumber(), TEST_VALUE);
    assert.equal(status, ClaimState.CLAIMED, 'Claim should be marked as claimed.');
    assert.equal(issuer, issuerRole);

    const balance = await this.rewardableToken.balanceOf(payee, { from: payee });
    assert.equal(balance, TEST_VALUE, 'Payee should receive tokens.');
  });

  it('non-issuers should NOT be able to airdrop', async () => {
    const isIssuer = await this.issuer.isIssuerStaff(other);
    assert.equal(isIssuer, false);

    await expectThrow(this.issuer.airdrop(payee, 100), { from: other });
  });

  it('issuers should NOT be able to airdrop to already claimed addresses', async () => {
    const { status } = await this.issuer.claims(payee);
    assert.equal(status.toNumber(), ClaimState.CLAIMED, 'Claim should be marked as claimed.');

    await expectThrow(this.issuer.airdrop(payee, 100), { from: issuerRole });
  });

  it('issuers should be able to airdrop to addresses which is neither issued nor claimed', async () => {
    const { status } = await this.issuer.claims(other);
    assert.equal(status.toNumber(), ClaimState.NONE, 'Claim should be marked as claimed.');

    const result = await this.issuer.airdrop(other, 100, { from: issuerRole });
    assertEvent(result, {
      event: 'Claimed',
      args: {
        payee: other,
        amount: 100,
      },
    }, 'A Claimed event is emitted.');

    const { status: newStatus, amount, issuer } = await this.issuer.claims(other);
    assert.equal(amount.toNumber(), 100);
    assert.equal(newStatus.toNumber(), ClaimState.CLAIMED, 'Claim should be marked as claimed.');
    assert.equal(issuer, issuerRole);
  });

  it('issuerRole should be able to remove self', async () => {
    await this.issuer.renounceIssuerStaff({ from: issuerRole });
    const hasRole = await this.issuer.isIssuerStaff(issuerRole, { from: other });
    assert.equal(hasRole, false);
  });

  it('non-owners cannot transferIssuership', async () => {
    const issuerContract = this.issuer.address;
    const issuerContractisIssuer = await this.rewardableToken.isIssuer(issuerContract)
    assert.equal(issuerContractisIssuer, true);

    const issuerContractIsRunning = await this.issuer.isRunning();
    assert.equal(issuerContractIsRunning, true);

    const newIssuerIsIssuer = await this.rewardableToken.isIssuer(newIssuer);
    assert.equal(newIssuerIsIssuer, false);

    const isOwner = await this.issuer.isOwner({ from: other });
    assert.equal(isOwner, false);

    await expectThrow(this.issuer.transferIssuership(newIssuer, { from: other }));

    const nextIssuerContractisIssuer = await this.rewardableToken.isIssuer(issuerContract);
    assert.equal(nextIssuerContractisIssuer, true);

    const nextIssuerContractIsRunning = await this.issuer.isRunning();
    assert.equal(nextIssuerContractIsRunning, true);

    const nextNewIssuerIsIssuer = await this.rewardableToken.isIssuer(newIssuer);
    assert.equal(nextNewIssuerIsIssuer, false);
  });

  it('owners CANNOT transferIssuership to old issuer', async () => {
    const issuerContract = this.issuer.address;
    const issuerContractisIssuer = await this.rewardableToken.isIssuer(issuerContract);
    assert.equal(issuerContractisIssuer, true);

    const issuerContractIsRunning = await this.issuer.isRunning();
    assert.equal(issuerContractIsRunning, true);

    const newIssuerIsIssuer = await this.rewardableToken.isIssuer(newIssuer);
    assert.equal(newIssuerIsIssuer, false);

    const ownerIsIssuer = await this.issuer.isOwner({ from: owner });
    assert.equal(ownerIsIssuer, true);

    await expectThrow(this.issuer.transferIssuership(issuerContract, { from: owner }));
  });

  it('owners can transferIssuership', async () => {
    const issuerContract = this.issuer.address;
    const issuerContractisIssuer = await this.rewardableToken.isIssuer(issuerContract);
    assert.equal(issuerContractisIssuer, true);

    const issuerContractIsRunning = await this.issuer.isRunning();
    assert.equal(issuerContractIsRunning, true);

    const newIssuerIsIssuer = await this.rewardableToken.isIssuer(newIssuer);
    assert.equal(newIssuerIsIssuer, false);

    const ownerIsIssuer = await this.issuer.isOwner({ from: owner });
    assert.equal(ownerIsIssuer, true);

    const result = await this.issuer.transferIssuership(newIssuer, { from: owner });
    assertEvent(result, {
      event: 'IssuershipTransferred',
      args: {
        from: issuerContract,
        to: newIssuer,
      },
    }, 'A IssuershipTransferred event is emitted.');

    const nextIssuerContractisIssuer = await this.rewardableToken.isIssuer(issuerContract)
    assert.equal(nextIssuerContractisIssuer, false);

    const nextIssuerContractIsRunning = await this.issuer.isRunning();
    assert.equal(nextIssuerContractIsRunning, false);

    const nextNewIssuerIsIssuer = await this.rewardableToken.isIssuer(newIssuer);
    assert.equal(nextNewIssuerIsIssuer, true);
  });

  it('issuer contract should be decomissioned when isRunning is false', async () => {
    const issuerContractIsRunning = await this.issuer.isRunning();
    assert.equal(issuerContractIsRunning, false);

    await expectThrow(this.issuer.transferOwnership(other, { from: newIssuer }));
    await expectThrow(this.issuer.issue(other, 100, { from: newIssuer }));
    await expectThrow(this.issuer.airdrop(other, 100, { from: newIssuer }));
  });
});
