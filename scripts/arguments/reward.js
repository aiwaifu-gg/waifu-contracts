module.exports = [
  process.env.DEPLOYER,
  process.env.TOKEN,
  {
    BlastPointsAddress: process.env.BLAST_POINT_ADDRSS,
    _pointsOperator: process.env.BLAST_OPERATOR,
  },
];
