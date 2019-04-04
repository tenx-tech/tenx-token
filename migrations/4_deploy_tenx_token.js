const BN = require('bn.js');

const BlacklistModerator = artifacts.require('BlacklistModerator');
const TENXToken = artifacts.require('TENXToken');

const CAP = new BN('205218255948577763364408207');

module.exports = async (deployer) => {
  const moderator = await BlacklistModerator.deployed();

  // Deploys TENXToken
  await deployer.deploy(
    TENXToken,
    moderator.address,
    CAP,
  ); // 6791298 gas
};
