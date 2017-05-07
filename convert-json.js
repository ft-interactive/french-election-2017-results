const baby = require('babyparse');
const data = require('./data/winners_round_1--extended-data.json');
const {writeFileSync} = require('fs');

const output = baby.unparse(data, {
  header: true,
});

writeFileSync('./data/winners_round_1--extended-data2.csv', output, 'utf-8');
