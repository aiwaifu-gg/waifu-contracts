module.exports = [
  process.env.DEPLOYER,
  30,
  process.env.TOKEN,
  process.env.INGREDIENT_NFT,
  process.env.WAIFU_NFT,
  {
    BlastPointsAddress: process.env.BLAST_POINT_ADDRSS,
    _pointsOperator: process.env.BLAST_OPERATOR,
  },
];
