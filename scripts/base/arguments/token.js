module.exports = [
  {
    defaultAdmin: process.env.DEPLOYER,
    supplyRecipient: process.env.SUPPLY_RECIPIENT,
    totalSupply: 1000000000,
    name: "AIWAIFU",
    symbol: "WAI",
  },
  {
    projectBuyTaxBasisPoints: "0",
    projectSellTaxBasisPoints: "0",
    projectTaxRecipient: process.env.PROJECT_TAX_RECIPIENT,
  },
];
