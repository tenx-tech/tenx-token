# Development

This document outlines the steps for running the project locally for development.

> For a high-level overview of the project, please check out `DESIGN.md` and `ARCHITECTURE.md`.

## Project Structure

```
├── config/
├── contracts/                                  (Solidity smart contracts, or "the backend")
│   ├── compliance/                             (Securities moderatory compliance rules)
│   ├── interfaces/                             (Contract interfaces)
│   ├── issuer/                                 (Token issuance)
│   ├── lib/                                    (Reusable libraries)
│   ├── mocks/                                  (Mock contracts for testing)
│   ├── rewards/                                (Token rewards)
│   ├── roles/                                  (Role-based authorization helpers)
│   └── token/                                  (Token contracts e.g. ERC20, 1400)
├── docs/                                       (Diagrams and documentation)
├── migrations/                                 (Smart contract deployment scripts)
├── scripts/
├── test/                                       (Smart contract unit tests)
└── README.md
```

## Prerequisites

To get started, install the following on your machine:

- Git, Node.js, and NPM
- [Truffle CLI](https://truffleframework.com/truffle) [`v5.1.x`](https://github.com/trufflesuite/truffle/releases/tag/v5.1.1)
- [Ganache](https://truffleframework.com/ganache)
- [Metamask](https://metamask.io/)
- [solc v0.5.0](https://solidity.readthedocs.io/en/v0.5.0/installing-solidity.html) (optional)
- [solhint](https://github.com/protofire/solhint)

## Solidity Learning Materials

New to Solidity? Here are some recommended resources to start with.

- [Truffle Pet Shop tutorial](https://truffleframework.com/tutorials/pet-shop): An end-to-end walkthrough of the basics of building a dApp.
- [Solidity in Depth](http://solidity.readthedocs.io/en/v0.5.0/solidity-in-depth.html): It's important to familiarize yourself with the Solidity language.
- [ERC20 Token Standard Interface](https://theethereum.wiki/w/index.php/ERC20_Token_Standard#The_ERC20_Token_Standard_Interface): Other than the Solidity, you'll want to get familiar with the ERCX standards and EIP proposals within the ecosystem. The ERC20 standard is a widely adopted interface for tokens.
- [OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-solidity): Once you have a firm grasp of the language and standards, start going through open source Solidity projects. The OpenZeppelin project is a  useful (albeit incomplete) overview of what's possible with smart contracts.
- [Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/): Helps you understand non-functional requirements within the smart contract ecosystem: design patterns, security, upgradability, and tooling.
- [Ethernaut](https://ethernaut.zeppelin.solutions/): Advanced security topics. Optional, but important.

## Setup Instructions

- Make sure that **Ganache is up and running locally** at port 8545.
- Go to Settings > Accounts & Keys 
- Disable `Autogenerate HD Mnemonic` and enter a Mnemonic you wish to use.
- Then, do the following:

```bash
git clone https://github.com/tenx-tech/TENX
cd TENX
npm install # Installs dependencies
npm run setup:hooks # Sets up pre-commit hook to automatically run linters and unit tests
```

- Finally, create an `.env` file in this project's root directory (see `env.sample` for an example):

```
MNEMONIC='foobar'
INFURA_ACCESS_TOKEN='test'
```

The `.env` file is used to deploy to TestNets such as `Ropsten` and `Rinkeby`. If you're developing locally, you can skip the final step.

## Coding Standards

The project uses [Solhint](https://github.com/protofire/solhint) to
maintain high security and code standards within our project. We are following
the code standards set forth in the [Official Solidity Style Guide](http://solidity.readthedocs.io/en/develop/style-guide.html) and the security standards outlined in the [ConsenSys Guide for Smart Contracts](https://consensys.github.io/smart-contract-best-practices/recommendations/).

## Commands

This section documents a list of helpful commands for development.

### Run tests

This command automatically deploys your contracts locally before running any tests.

```bash
npm test
npm run coverage
```

### Run linters

```bash
npm run lint
```

### Deploy contracts locally

You need to deploy your contracts locally in testRPC (Ganache) before you can interact with it from the console.

```bash
npm run migrate
```

### Hard reset contracts locally

```bash
npm run reset
```

### Interacting with contracts with Truffle console

```bash
npm run console
truffle(development)> TENXToken.at('0x51437dd2e4b8fd663c7f1a784160d6ef2259161b')
...<Contract details>
truffle(development)> TENXToken.at("0x51437dd2e4b8fd663c7f1a784160d6ef2259161b").totalSupply().then((n) => n.toString(10));
...<total supply>
```

### Static analysis with Surya

You can set up [surya](https://github.com/ConsenSys/surya), a static analysis tool:

```bash
npm run setup:surya
```

Go [here](https://github.com/ConsenSys/surya) for detailed usage instructions.

#### List Contract API

```bash
surya describe contracts/**/*.sol
```

#### Draw Contract Inheritance Tree

```bash
surya inheritance contracts/TENXToken.sol | dot -Tpng > Graph.png | open Graph.png
```

#### Draw Control Flow Graph

```bash
surya graph contracts/**/*.sol | dot -Tpng > Graph.png | open Graph.png
```

### Static Analysis with Mythril

To set up [mythril](https://github.com/ConsenSys/mythril/wiki/With-Docker):

```
npm run setup:mythril
```

Then, from the root project directory run:

```
npm run mythril
```

## Deploying to the Rinkeby TestNet

Run the following:

```
npm run deploy:rinkeby
```

You can also run individual migrations by using the `--from` and `--to` flags:

```
truffle migrate -f 4 --to 4 --network rinkeby
```

### Deployment Artifacts

Contracts are live on the [Rinkeby](https://rinkeby.etherscan.io/) testnet. Contract ABIs can be found in `/abis/`. Contract addresses can be found in the `networks` attribute.

### How to Deploy

Here's how you can deploy to the Rinkeby testnet:

- Make sure you have [MetaMask](https://metamask.io/) installed.
- On Metamask, select Rinkeby and Import an account using your configured `process.env.MNEMONIC` and `process.env.INFURA_ACCESS_TOKEN`.
- Copy the account number imported on Metamask to your clipboard,
- Make sure you have enough ether in your account to do the deployment and other transactions. You can acquire ether for your account on the Rinkeby network through a service known as a faucet [here](https://www.rinkeby.io/#faucet).
- Then, run:

```bash
npm run deploy:rinkeby
```

or:

```
truffle migrate -f 1 --to 6 --network rinkeby
```

- If all goes well, you should see a successful deployment response. To verify that the contract is deployed, you can check the [Rinkeby Etherscan](https://rinkeby.etherscan.io/).
- Find the transaction ID of the contract from the deployment response, and enter it in the search field. You should see details about the transaction, including the block number where the transaction was secured.
- After a deploy, you can find the deployed contract ABIs in the `build\` folder. ABIs are like Swaggerfiles for smart contracts. Ethereum clients and dApps runs with these ABIs as inputs to interact with smart contracts.

> **Important:** After a successful testnet / mainnet deployment, save the contents of the `build/` artifacts folder into the `abi/` directory for dApp consumption.

You can [interact](https://truffleframework.com/docs/truffle/reference/contract-abstractions#usage) with your contracts using `truffle console`:

```
> truffle console --network rinkeby
truffle(rinkeby)> const tenx = await TENXToken.deployed()
undefined
truffle(rinkeby)> tenx.address
'0x66091846dbAD990eC3840394bd18010F33e0720c'
```

## Contributing

Please check out our
[Contribution Guidelines](https://github.com/tenx-tech/tenx-token/blob/master/docs/CONTRIBUTING.md).