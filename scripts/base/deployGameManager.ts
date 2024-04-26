import { ethers, upgrades } from "hardhat";
const deployParams = require("./arguments/gm.js");

(async () => {
  try {
    const GameManager = await ethers.getContractFactory(
      "contracts/base/game/GameManager.sol:GameManager"
    );
    const gm = await upgrades.deployProxy(GameManager, deployParams);

    // Set costs
    console.log("GameManager deployed to:", gm.target);
    await gm.updateLevelMap([1, 2, 3], [3, 1, 2]);
    await gm.updateTemptMap([1, 2, 3], [3, 1, 2]);

    await gm.updateLevelCost(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [
        {
          ingredients: 10,
          tokens: 100,
          duration: 1 * 60 * 60,
        },
        {
          ingredients: 15,
          tokens: 150,
          duration: 2 * 60 * 60,
        },
        {
          ingredients: 20,
          tokens: 200,
          duration: 3 * 60 * 60,
        },
        {
          ingredients: 25,
          tokens: 250,
          duration: 4 * 60 * 60,
        },
        {
          ingredients: 30,
          tokens: 300,
          duration: 5 * 60 * 60,
        },
        {
          ingredients: 35,
          tokens: 350,
          duration: 6 * 60 * 60,
        },
        {
          ingredients: 40,
          tokens: 400,
          duration: 7 * 60 * 60,
        },
        {
          ingredients: 45,
          tokens: 450,
          duration: 8 * 60 * 60,
        },
        {
          ingredients: 50,
          tokens: 500,
          duration: 9 * 60 * 60,
        },
        {
          ingredients: 55,
          tokens: 550,
          duration: 10 * 60 * 60,
        },
      ]
    );
  } catch (e) {
    console.log(e);
  }
})();
