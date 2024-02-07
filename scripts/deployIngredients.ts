import { ethers } from "hardhat";
const deployParams = require("./arguments/ingredients.js");

(async () => {
  try {
    const nft = await ethers.deployContract("Ingredients", deployParams);
    console.log("Ingredients deployed to:", nft.target);
  } catch (e) {
    console.log(e);
  }
})();
