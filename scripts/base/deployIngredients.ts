import { ethers } from "hardhat";
const deployParams = require("./arguments/ingredients.js");

(async () => {
  try {
    console.log(deployParams);

    const nft = await ethers.deployContract(
      "contracts/base/token/Ingredients.sol:Ingredients",
      deployParams
    );
    console.log("Ingredients deployed to:", nft.target);
  } catch (e) {
    console.log(e);
  }
})();
