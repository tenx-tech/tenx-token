const { expectThrow } = require('./helpers');

const Issuer = artifacts.require('Issuer');
const TENXToken = artifacts.require('TENXToken.sol');
const BasicModerator = artifacts.require('BasicModerator.sol');

contract('Issuership Transfer', ([owner]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();

    // Deploys token
    this.token = await TENXToken.new(this.moderator.address, 200);

    // Deploys issuer
    this.issuer = await Issuer.new(this.token.address);

    const ownerIsIssuer = await this.token.isIssuer(owner);
    assert.equal(ownerIsIssuer, true); // Issuership is transferred

    const issuerContractIsIssuer = await this.token.isIssuer(this.issuer.address);
    assert.equal(issuerContractIsIssuer, false);
  });

  it('owner should NOT be able to transfer issuership to self', async () => {
    await expectThrow(this.token.transferIssuership(owner, { from: owner }));
  });

  it('owner should be able to transfer issuership', async () => {
    // Links token contract and issuer
    await this.token.transferIssuership(this.issuer.address, { from: owner });

    const ownerIsIssuer = await this.token.isIssuer(owner);
    assert.equal(ownerIsIssuer, false); // Issuership is transferred

    const issuerContractIsIssuer = await this.token.isIssuer(this.issuer.address);
    assert.equal(issuerContractIsIssuer, true);
  });
});
