import { ethers } from "hardhat";
const deployParams = require("./arguments/shop.js");

(async () => {
  try {
    const shop = await ethers.deployContract("Shop", deployParams);
    console.log("Shop deployed to:", shop.target);
  } catch (e) {
    console.log(e);
  }
})();
