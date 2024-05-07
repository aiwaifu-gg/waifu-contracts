import { ethers } from "hardhat";
const deployParams = require("./arguments/baseIngredients.js");

(async () => {
  try {
    const nft = await ethers.deployContract("BaseIngredients", deployParams);
    console.log("Ingredients deployed to:", nft.target);
  } catch (e) {
    console.log(e);
  }
})();
