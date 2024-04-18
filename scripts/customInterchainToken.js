const hre = require("hardhat");
const crypto = require("crypto");
const ethers = hre.ethers;
const {
  AxelarQueryAPI,
  Environment,
  EvmChain,
  GasToken,
} = require("@axelar-network/axelarjs-sdk");

const interchainTokenServiceContractABI = require("../utils/interchainTokenServiceABI");
const blastTokenABI = require("../utils/WaifuToken");

const MINT_BURN = 4;
const LOCK_UNLOCK = 2;

const interchainTokenServiceContractAddress =
  "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C";

const blastTokenAddress = "0x1E229eeBE5299D1f8d8DF64C7ab40d70C1bdCE53"; // Replace with your token address on fantom
const baseTokenAddress = "0x37A5D883e99b39946cb3848F5ed93926431244f9"; // Replace with your token address on Polygon

async function getSigner() {
    const [signer] = await ethers.getSigners();
    return signer;
  }

  async function getContractInstance(contractAddress, contractABI, signer) {
    return new ethers.Contract(contractAddress, contractABI, signer);
  }

  async function deployTokenManagerBlast() {
    // Get a signer to sign the transaction
    const signer = await getSigner();
  
    // Get the InterchainTokenService contract instance
    const interchainTokenServiceContract = await getContractInstance(
      interchainTokenServiceContractAddress,
      interchainTokenServiceContractABI,
      signer
    );
  
    // Generate a random salt
    const salt = "0x" + crypto.randomBytes(32).toString("hex");
  
    // Create params
    const AbiCoder = new ethers.AbiCoder
    const params = AbiCoder.encode(
      ["bytes", "address"],
      [signer.address, blastTokenAddress]
    );
  
    // Deploy the token manager
    const deployTxData = await interchainTokenServiceContract.deployTokenManager(
      salt,
      "",
      LOCK_UNLOCK,
      params,
      ethers.parseEther("0.01")
    );
  
    // Get the tokenId
    const tokenId = await interchainTokenServiceContract.interchainTokenId(
      signer.address,
      salt
    );
  
    // Get the token manager address
    const expectedTokenManagerAddress =
      await interchainTokenServiceContract.tokenManagerAddress(tokenId);
  
    console.log(
      `
      Salt: ${salt},
      Transaction Hash: ${deployTxData.hash},
      Token ID: ${tokenId},
      Expected token manager address: ${expectedTokenManagerAddress},
      `
    );
  }

  const api = new AxelarQueryAPI({ environment: Environment.TESTNET });

    // Estimate gas costs
    async function gasEstimator() {
    const gas = await api.estimateGasFee(
        "blast-sepolia",
        "base-sepolia",
        GasToken.BASE,
        700000,
        1.1
    );

    return gas;
    }

    async function gasWithdrawEstimator() {
    const withdrawGas = await api.estimateGasFee(
        "base-sepolia",
        "blast-sepolia",
        GasToken.BASE,
        700000,
        1.1
    );

    return withdrawGas;
    }

    async function deployRemoteTokenManager() {
        // Get a signer to sign the transaction
        const signer = await getSigner();
      
        // Get the InterchainTokenService contract instance
        const interchainTokenServiceContract = await getContractInstance(
          interchainTokenServiceContractAddress,
          interchainTokenServiceContractABI,
          signer
        );
      
        // Create params
        const AbiCoder = new ethers.AbiCoder
        const param = AbiCoder.encode(
          ["bytes", "address"],
          [signer.address, baseTokenAddress]
        );
      
        const gasAmount = await gasEstimator();
        console.log(gasAmount)
      
        // Deploy the token manager
        const deployTxData = await interchainTokenServiceContract.deployTokenManager(
          "0x9af4897144f0d569ee9a0ab769674d9cc43d3d8c5467dd562dcf81603d50607c", // change salt
          "base-sepolia",
          MINT_BURN,
          param,
          gasAmount,
          { value: gasAmount }
        );
      
        // Get the tokenId
        const tokenId = await interchainTokenServiceContract.interchainTokenId(
          signer.address,
          "0x9af4897144f0d569ee9a0ab769674d9cc43d3d8c5467dd562dcf81603d50607c" // change salt
        );
      
        // Get the token manager address
        const expectedTokenManagerAddress =
          await interchainTokenServiceContract.tokenManagerAddress(tokenId);
      
        console.log(
          `
          Transaction Hash: ${deployTxData.hash},
          Token ID: ${tokenId},
          Expected token manager address: ${expectedTokenManagerAddress},
          `
        );
      }

      async function transferTokens() {
        // Get a signer to sign the transaction
        const signer = await getSigner();
      
        const interchainTokenServiceContract = await getContractInstance(
          interchainTokenServiceContractAddress,
          interchainTokenServiceContractABI,
          signer
        );
        const gasAmount = await gasEstimator();
        const transfer = await interchainTokenServiceContract.interchainTransfer(
          "0xadf509682ca3a763d5213e93aae3439b75ca1378310f553196547c3cd20bca8f", // tokenId, the one you store in the earlier step
          "base-sepolia",
          "0xaa273E19e0281790116563C979d3b0AD49dD2FcA", // receiver address
          ethers.parseEther("500"), // amount of token to transfer
          "0x",
          gasAmount, // gasValue
          {
            // Transaction options should be passed here as an object
            value: gasAmount,
          }
        );
      
        console.log("Transfer Transaction Hash:", transfer.hash);
        // 0x65258117e8133397b047a6192cf69a1b48f59b0cb806be1c0fa5a7c1efd747ef
      }

      async function withdrawTokens() {
        // Get a signer to sign the transaction
        const signer = await getSigner();
      
        const interchainTokenServiceContract = await getContractInstance(
          interchainTokenServiceContractAddress,
          interchainTokenServiceContractABI,
          signer
        );
        const gasAmount = await gasWithdrawEstimator();
        const transfer = await interchainTokenServiceContract.interchainTransfer(
          "0xadf509682ca3a763d5213e93aae3439b75ca1378310f553196547c3cd20bca8f", // tokenId, the one you store in the earlier step
          "blast-sepolia",
          "0xaa273E19e0281790116563C979d3b0AD49dD2FcA", // receiver address
          ethers.parseEther("100"), // amount of token to transfer
          "0x",
          gasAmount, // gasValue
          {
            // Transaction options should be passed here as an object
            value: gasAmount,
          }
        );
      
        console.log("Transfer Transaction Hash:", transfer.hash);
        // 0x65258117e8133397b047a6192cf69a1b48f59b0cb806be1c0fa5a7c1efd747ef
      }


  async function main() {
    const functionName = process.env.FUNCTION_NAME;
    switch (functionName) {
      case "deployTokenManagerBlast":
        await deployTokenManagerBlast();
        break;
      case "deployRemoteTokenManager":
        await deployRemoteTokenManager();
        break;
        case "transferTokens":
            await transferTokens();
            break;
        case "withdrawTokens":
            await withdrawTokens();
            break;
      default:
        console.error(`Unknown function: ${functionName}`);
        process.exitCode = 1;
        return;
    }
  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });