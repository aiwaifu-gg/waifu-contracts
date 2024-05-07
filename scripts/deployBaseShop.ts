import { ethers } from "hardhat";
const deployParams = require("./arguments/baseShop.js");

(async () => {
  try {
    const shop = await ethers.deployContract("BaseShop", deployParams);
    console.log("Shop deployed to:", shop.target);
  } catch (e) {
    console.log(e);
  }
})();
