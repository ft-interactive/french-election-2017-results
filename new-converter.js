const data = require('./flatmap.json');

const stringify = require('csv-stringify');
const parse = require('csv-parse');

const {writeFileSync} = require('fs');

const done = Object.entries(data).map(([key, _candidates]) => {
  const candidates = _candidates.sort((a, b) => Number(b.nbvoix) - Number(a.nbvoix));
  const lepen_ranking_2017       = candidates.findIndex(d => d.nompsn === 'LE PEN') + 1;
  const macron_ranking_2017      = candidates.findIndex(d => d.nompsn === 'MACRON') + 1;
  const hamon_ranking_2017       = candidates.findIndex(d => d.nompsn === 'HAMON') + 1;
  const melenchon_ranking_2017   = candidates.findIndex(d => d.nompsn === 'MÉLENCHON') + 1;
  const fillon_ranking_2017      = candidates.findIndex(d => d.nompsn === 'FILLON') + 1;
  const lepen_vote_pc_2017       = Number(candidates.find(d => d.nompsn === 'LE PEN').rapportexprime.replace(',', '.'));
  const macron_vote_pc_2017      = Number(candidates.find(d => d.nompsn === 'MACRON').rapportexprime.replace(',', '.'));
  const hamon_vote_pc_2017       = Number(candidates.find(d => d.nompsn === 'HAMON').rapportexprime.replace(',', '.'));
  const melenchon_vote_pc_2017   = Number(candidates.find(d => d.nompsn === 'MÉLENCHON').rapportexprime.replace(',', '.'));
  const fillon_vote_pc_2017      = Number(candidates.find(d => d.nompsn === 'FILLON').rapportexprime.replace(',', '.'));
  return {
    code: key,
    lepen_ranking_2017,
    macron_ranking_2017,
    hamon_ranking_2017,
    melenchon_ranking_2017,
    fillon_ranking_2017,
    lepen_vote_pc_2017,
    macron_vote_pc_2017,
    hamon_vote_pc_2017,
    melenchon_vote_pc_2017,
    fillon_vote_pc_2017,
  };
});

stringify(done, {
  header: true
}, (err, parsed) => {
  console.error(err);
  writeFileSync('./data/winners.csv', parsed, {encoding: 'utf8'});
});
