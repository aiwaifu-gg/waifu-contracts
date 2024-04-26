import { ethers } from "hardhat";
const deployParams = require("./arguments/shop.js");

(async () => {
  try {
    const shop = await ethers.deployContract(
      "contracts/blast/exchange/Shop.sol:Shop",
      deployParams
    );
    console.log("Shop deployed to:", shop.target);
  } catch (e) {
    console.log(e);
  }
})();
