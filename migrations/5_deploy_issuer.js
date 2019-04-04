const TENXToken = artifacts.require('TENXToken');
const Issuer = artifacts.require('Issuer');

module.exports = async (deployer) => {
  const token = await TENXToken.deployed();

  // Deploys Issuer
  const issuer = await deployer.deploy(
    Issuer,
    token.address,
  );

  await token.transferIssuership(issuer.address);
};
