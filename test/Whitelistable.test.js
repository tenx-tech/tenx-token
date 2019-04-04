const { expectThrow, assertEvent } = require('./helpers');

const Whitelistable = artifacts.require('WhitelistableMock.sol');


contract('Whitelistable', ([owner, moderator, other]) => {
  before(async () => {
    // Deploys moderator
    this.whitelistable = await Whitelistable.new();
  });

  it('should initialize correctly', async () => {
    const result = await this.whitelistable.isModerator(owner);
    assert.equal(result, true);
  });

  it('non-moderators should NOT be able to add new moderators', async () => {
    await expectThrow(this.whitelistable.addModerator(moderator, { from: moderator }));

    const result = await this.whitelistable.isModerator(moderator);
    assert.equal(result, false);
  });

  it('moderator should be able to add new moderators', async () => {
    await this.whitelistable.addModerator(moderator, { from: owner });
    const result = await this.whitelistable.isModerator(moderator);
    assert.equal(result, true);
  });

  it('onlyWhitelisted should NOT be callable when not whitelisted', async () => {
    const result = await this.whitelistable.isWhitelisted(other);
    assert.equal(result, false);

    await expectThrow(this.whitelistable.doSomethingElse({ from: other }));
  });

  it('onlyNotWhitelisted should be callable when not whitelisted', async () => {
    const result = await this.whitelistable.isWhitelisted(other);
    assert.equal(result, false);

    await this.whitelistable.doSomething({ from: other });
  });  

  it('non-moderators should NOT be able to whitelist', async () => {
    const isModerator = await this.whitelistable.isModerator(other);
    assert.equal(isModerator, false);

    await expectThrow(this.whitelistable.whitelist(moderator, { from: other }));
  });

  it('moderators should NOT be able to whitelist self', async () => {
    const isModerator = await this.whitelistable.isModerator(moderator);
    assert.equal(isModerator, true);

    await expectThrow(this.whitelistable.whitelist(moderator, { from: moderator }));
  });

  it('moderators should be able to whitelist accounts', async () => {
    const result = await this.whitelistable.whitelist(other, { from: moderator });
    assertEvent(result, {
      event: 'Whitelisted',
      args: {
        account: other,
      },
    }, 'A Whitelisted event is emitted.', 0);

    const isWhitelisted = await this.whitelistable.isWhitelisted(other);
    assert.equal(isWhitelisted, true);
  });

  it('onlyWhitelisted should be callable when whitelisted', async () => {
    const result = await this.whitelistable.isWhitelisted(other);
    assert.equal(result, true);

    await this.whitelistable.doSomethingElse({ from: other });
  });

  it('onlyNotWhitelisted should NOT be callable when whitelisted', async () => {
    const result = await this.whitelistable.isWhitelisted(other);
    assert.equal(result, true);

    await expectThrow(this.whitelistable.doSomething({ from: other }));
  });

  it('non-moderators should NOT be able to unwhitelist', async () => {
    await this.whitelistable.whitelist(moderator, { from: owner });

    const isWhitelisted = await this.whitelistable.isWhitelisted(moderator);
    assert.equal(isWhitelisted, true);

    await expectThrow(this.whitelistable.unwhitelist(moderator, { from: other }));
  });

  it('moderators should NOT be able to unwhitelist self', async () => {
    await expectThrow(this.whitelistable.unwhitelist(moderator, { from: moderator }));
  });

  it('moderators should be able to unwhitelist accounts', async () => {
    const result = await this.whitelistable.unwhitelist(other, { from: moderator });
    assertEvent(result, {
      event: 'Unwhitelisted',
      args: {
        account: other,
      },
    }, 'An Unwhitelisted event is emitted.', 0);

    const isWhitelisted = await this.whitelistable.isWhitelisted(other);
    assert.equal(isWhitelisted, false);
  });
});
