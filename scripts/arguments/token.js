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
    BlastPointsAddress: process.env.BLAST_POINT_ADDRSS,
    _pointsOperator: process.env.BLAST_OPERATOR
  }
];
