import { ethers, upgrades } from "hardhat";

(async () => {
  try {
    const GameManager = await ethers.getContractFactory("GameManager");
    const gm = await upgrades.upgradeProxy(process.env.GM, GameManager);
    console.log("Upgraded", gm.target);
  } catch (e) {
    console.log(e);
  }
})();
