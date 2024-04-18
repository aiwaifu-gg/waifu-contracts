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
const interchainTokenManagerABI = require("../utils/interchainTokenManager");

const MINT_BURN = 4;
const LOCK_UNLOCK = 2;

const interchainTokenServiceContractAddress =
  "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C";

const blastTokenAddress = "0x07fe1CA6cd45C2fABDa63ABc1bbdE8226Cdf2974"; // Replace with your token address on fantom
const baseTokenAddress = "0x9F82C6c57c7329b7629E435525367cd8245aC104"; // Replace with your token address on Polygon

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
          "0x0fa8af356b9fc70021905521a33e7f1415bd9fb1c4abf4c1276803b733af0f90", // change salt
          "base-sepolia",
          MINT_BURN,
          param,
          gasAmount,
          { value: gasAmount }
        );
      
        // Get the tokenId
        const tokenId = await interchainTokenServiceContract.interchainTokenId(
          signer.address,
          "0x0fa8af356b9fc70021905521a33e7f1415bd9fb1c4abf4c1276803b733af0f90" // change salt
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
          "0xf88b87df5d2b0c32c4e63186cd1f0de0b91099adef33d450587568e2155fdf73", // tokenId, the one you store in the earlier step
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
          "0xf88b87df5d2b0c32c4e63186cd1f0de0b91099adef33d450587568e2155fdf73", // tokenId, the one you store in the earlier step
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

      async function checkImplementation() {
        const signer = await getSigner();

        const interchainTokenManager = await getContractInstance(
            "0x136a1c70190c2e9e1dc0dc7c2f257450d1eccf5d",
            interchainTokenManagerABI,
            signer
        );

        const data = await interchainTokenManager.getImplementationTypeAndTokenAddress()
        console.log(data)

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
        case "checkImplementation":
            await checkImplementation();
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