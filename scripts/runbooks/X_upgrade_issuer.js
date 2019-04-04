// To be run as a Migration

const TENXToken = artifacts.require('TENXToken');
const Issuer = artifacts.require('Issuer');
const IssuerV2 = artifacts.require('IssuerV2');

module.exports = async (deployer) => {
  // Deploys IssuerV2
  const issuerV2 = await deployer.deploy(
    IssuerV2,
    TENXToken.address,
  );

  const issuer = await Issuer.deployed();
  await issuer.pause();

  await issuer.transferIssuership(issuerV2.address); // Set IssuerV2 contract as sole issuer
};
