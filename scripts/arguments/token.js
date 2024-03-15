module.exports = [
  {
    defaultAdmin: process.env.DEPLOYER,
    supplyRecipient: process.env.SUPPLY_RECIPIENT,
    totalSupply: 1000000000,
    name: "WAIFU",
    symbol: "$WAIFU",
  },
  {
    projectBuyTaxBasisPoints: "500",
    projectSellTaxBasisPoints: "500",
    projectTaxRecipient: process.env.PROJECT_TAX_RECIPIENT,
  },
  {
    BlastPointsAddress: "0x2fc95838c71e76ec69ff817983BFf17c710F34E0", //test
    //BlastPointsAddress: "0x2536FE9ab3F511540F2f9e2eC2A805005C3Dd800" // live
    _pointsOperator: process.env.DEPLOYER
  }
];
