/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    apiKey: {
      blast: process.env.BLAST_API_KEY,
      blast_sepolia: "blast_sepolia", // apiKey is not required, just set a placeholder
    },
    customChains: [
      {
        network: "blast",
        chainId: 81457,
        urls: {
          apiURL:
            "https://api.routescan.io/v2/network/mainnet/evm/81457/etherscan",
          browserURL: "https://blastscan.io",
        },
      },
      {
        network: "blast_sepolia",
        chainId: 168587773,
        urls: {
          apiURL:
            "https://api.routescan.io/v2/network/testnet/evm/168587773/etherscan",
          browserURL: "https://testnet.blastscan.io",
        },
      },
    ],
  },
  networks: {
    blast: {
      url: "https://rpc.blast.io",
      accounts: [process.env.PRIVATE_KEY ?? ""],
      gasPrice: 1000000000,
    },
    "blast-sepolia": {
      url: "https://sepolia.blast.io",
      accounts: [process.env.PRIVATE_KEY ?? ""],
      gasPrice: 1000000000,
    },
  },
  sourcify: {
    enabled: true,
  },
};
