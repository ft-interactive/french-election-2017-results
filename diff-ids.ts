/**
 * Convert the script's output from JSON to CSV
 */

import * as stringify from 'csv-stringify';
import * as parse from 'csv-parse';

import {
	createReadStream,
	createWriteStream,
	readFileSync, writeFileSync,
} from 'fs';

import { Transform } from 'stream';

import {
	FEIndex,
	FEDepartement,
	FERegion,
	FECandidat,
	FEResult,
} from './index';

// Create an input and an output stream
const spreadsheet = readFileSync('./data/communes.csv', {encoding: 'utf8'});
const output = require('./flatmap.json');

const xmlIds: string[] = Object.keys(output);

parse(spreadsheet, {columns: true}, (err, data) => {
	const spreadsheetIds: string[] = data.map((d: any) => d.insee);

	const IDS_NOT_IN_SPREADSHEET = xmlIds.filter(d => {
		return spreadsheetIds.indexOf(d) === -1;
	});

	const IDS_NOT_IN_XML = spreadsheetIds.filter(d => {
		return xmlIds.indexOf(d) === -1;
	});

	writeFileSync('./data/IDS_DIFF.json', JSON.stringify({
		IDS_NOT_IN_SPREADSHEET,
		IDS_NOT_IN_XML,
	}, null, '\t'), {encoding: 'utf8'});
});

//
// const output = createWriteStream('./data/complete.csv');
//
// // Import our JSON file and flatten it into an object indexed by departement + commune code.
// const results: FEResult = require('./output.json');
// const totalVotes: any = {};
// const resultsFlat = Object.keys(results).reduce((col, key) => {
// 	results[key].forEach(item => {
// 		col[`${item.dpt}${item.com}`] = item.candidates.sort((a, b) => Number(a.nbvoix) - Number(b.nbvoix));
// 		// if (item.com.length === 3) {
// 		// 	// Sort it by number of votes to get outcome order.
// 		// 	col[`${item.dpt}${item.com}`] = item.candidates.sort((a, b) => Number(a.nbvoix) - Number(b.nbvoix));
// 		// } else { //
// 		// 	console.dir(item.com);
// 		// 	const com = item.com.slice(0, -1);
// 		// 	if (!col.hasOwnProperty(`${item.dpt}${com}`)) {
// 		// 		col[`${item.dpt}${com}`] = [];
// 		// 	}
// 		// 	col[`${item.dpt}${com}`].push(item.candidates.sort((a, b) => Number(a.nbvoix) - Number(b.nbvoix)));
// 		// 	totalVotes[`${item.dpt}${com}`] += item.votes;
// 		// }
// 	});
//
// 	return col;
// }, <Flatmap>{});
//
// writeFileSync('./flatmap.json', JSON.stringify(resultsFlat));
//
// process.exit();
//
// // Quick Transform stream for adding data to the result template
// export class AddElectionData extends Transform {
// 	constructor(options: any = {}) {
// 		options.objectMode = true;
// 		super(options);
// 	}
//
// 	_transform(_data: FECSVRow, encoding: string, cb: Function) {
// 		const data = Object.assign({}, _data);
// 		const item = resultsFlat[data.code];
// 		const candidates = <Array<FECandidat>>item;
// 		// Rankings
// 		try {
// 			data.lepen_ranking_2017       = candidates.findIndex(d => d.nompsn === 'LE PEN') + 1;
// 			data.macron_ranking_2017      = candidates.findIndex(d => d.nompsn === 'MACRON') + 1;
// 			data.hamon_ranking_2017       = candidates.findIndex(d => d.nompsn === 'HAMON') + 1;
// 			data.melenchon_ranking_2017   = candidates.findIndex(d => d.nompsn === 'MÉLENCHON') + 1;
// 			data.fillon_ranking_2017      = candidates.findIndex(d => d.nompsn === 'FILLON') + 1;
//
// 			// Vote % (decimal)
// 			data.lepen_vote_pc_2017       = Number(candidates.find(d => d.nompsn === 'LE PEN').rapportexprime.replace(',', '.'));
// 			data.macron_vote_pc_2017      = Number(candidates.find(d => d.nompsn === 'MACRON').rapportexprime.replace(',', '.'));
// 			data.hamon_vote_pc_2017       = Number(candidates.find(d => d.nompsn === 'HAMON').rapportexprime.replace(',', '.'));
// 			data.melenchon_vote_pc_2017   = Number(candidates.find(d => d.nompsn === 'MÉLENCHON').rapportexprime.replace(',', '.'));
// 			data.fillon_vote_pc_2017      = Number(candidates.find(d => d.nompsn === 'FILLON').rapportexprime.replace(',', '.'));
//
// 			// Changes
// 			data.lepen_change_2017        = Number(candidates.find(d => d.nompsn === 'LE PEN').rapportexprime.replace(',', '.')) - data.FN_vote_pc_2012;
// 			data.hamon_change_2017        = Number(candidates.find(d => d.nompsn === 'HAMON').rapportexprime.replace(',', '.')) - data.SOC_vote_pc_2012;
// 			data.melenchon_change_2017    = Number(candidates.find(d => d.nompsn === 'MÉLENCHON').rapportexprime.replace(',', '.')) - data.LF_vote_pc_2012;
// 			data.fillon_change_2017       = Number(candidates.find(d => d.nompsn === 'FILLON').rapportexprime.replace(',', '.')) - data.REP_vote_pc_2012;
//
// 			cb(null, data);
// 		} catch (e) {
// 			console.error(`Error with ${data.code}`);
// 			// merge(data);
// 			cb(null, data);
// 		}
// 	}
// }
//
// function merge(data: any) {
// 	// const matcher = new RegExp(`/^${data.code}/`);
// 	// console.log(matcher.test(data.code));
// 	// const children = Object.keys(resultsFlat).filter(d => matcher.test(d));
// 	// console.dir(children);
// 	// try {
// 	// 	const itemA: FECandidat[][] = <FECandidat[][]>item;
// 	// 	const lepen = itemA.reduce((ar, d) => ar.concat(d.filter(d => d.nompsn === 'LE PEN')), []);
// 	// 	const lepen_votes: number = lepen.reduce((total, curr) => {
// 	// 		total += Number(curr.nbvoix);
// 	// 		return total;
// 	// 	}, 0);
// 	//
// 	// 	const macron = itemA.reduce((ar, d) => ar.concat(d.filter(d => d.nompsn === 'MACRON')), []);
// 	// 	const macron_votes: number = macron.reduce((total, curr) => {
// 	// 		total += Number(curr.nbvoix);
// 	// 		return total;
// 	// 	}, 0);
// 	//
// 	// 	const hamon = itemA.reduce((ar, d) => ar.concat(d.filter(d => d.nompsn === 'HAMON')), []);
// 	// 	const hamon_votes: number = hamon.reduce((total, curr) => {
// 	// 		total += Number(curr.nbvoix);
// 	// 		return total;
// 	// 	}, 0);
// 	// 	const melenchon = itemA.reduce((ar, d) => ar.concat(d.filter(d => d.nompsn === 'MÉLENCHON')), []);
// 	// 	const melenchon_votes: number = melenchon.reduce((total, curr) => {
// 	// 		total += Number(curr.nbvoix);
// 	// 		return total;
// 	// 	}, 0);
// 	//
// 	// 	const fillon = itemA.reduce((ar, d) => ar.concat(d.filter(d => d.nompsn === 'FILLON')), []);
// 	// 	const fillon_votes: number = fillon.reduce((total, curr) => {
// 	// 		total += Number(curr.nbvoix);
// 	// 		return total;
// 	// 	}, 0);
// 	//
// 	// 	data.lepen_vote_pc_2017 = totalVotes[data.code] / lepen_votes * 100;
// 	// 	data.macron_vote_pc_2017 = totalVotes[data.code] / macron_votes * 100;
// 	// 	data.hamon_vote_pc_2017 = totalVotes[data.code] / hamon_votes * 100;
// 	// 	data.melenchon_vote_pc_2017 = totalVotes[data.code] / melenchon_votes * 100;
// 	// 	data.fillon_vote_pc_2017 = totalVotes[data.code] / fillon_votes * 100;
// 	//
// 	// 	data.lepen_change_2017        =  data.lepen_vote_pc_2017 - data.FN_vote_pc_2012;
// 	// 	data.hamon_change_2017        =  data.hamon_vote_pc_2017 - data.SOC_vote_pc_2012;
// 	// 	data.melenchon_change_2017    =  data.melenchon_vote_pc_2017 - data.LF_vote_pc_2012;
// 	// 	data.fillon_change_2017       =  data.fillon_vote_pc_2017 - data.REP_vote_pc_2012;
// 	//
// 	// 	const ordering = [
// 	// 		{
// 	// 			name: 'lepen',
// 	// 			votes: lepen_votes,
// 	// 		},
// 	// 		{
// 	// 			name: 'macron',
// 	// 			votes: macron_votes,
// 	// 		},
// 	// 		{
// 	// 			name: 'hamon',
// 	// 			votes: hamon_votes,
// 	// 		},
// 	// 		{
// 	// 			name: 'melenchon',
// 	// 			votes: melenchon_votes,
// 	// 		},
// 	// 		{
// 	// 			name: 'fillon',
// 	// 			votes: fillon_votes,
// 	// 		},
// 	// 	];
// 	//
// 	// 	ordering.sort((a, b) => Number(b.votes) - Number(a.votes));
// 	//
// 	// 	data.lepen_ranking_2017 = ordering.findIndex(d => d.name === 'lepen') + 1;
// 	// 	data.macron_ranking_2017 = ordering.findIndex(d => d.name === 'macron') + 1;
// 	// 	data.hamon_ranking_2017 = ordering.findIndex(d => d.name === 'hamon') + 1;
// 	// 	data.melenchon_ranking_2017 = ordering.findIndex(d => d.name === 'melenchon') + 1;
// 	// 	data.fillon_ranking_2017 = ordering.findIndex(d => d.name === 'fillon') + 1;
// 	//
// 	// 	cb(null, data);
// 	// } catch (e) {
// 	// 	console.error(`Issue with ${data.code}`);
// 	// 	cb(null, data);
// 	// }
// }
//
// // Finally start piping stuff
//
// spreadsheet
// 	.pipe(parse({columns: true}))
// 	.pipe(new AddElectionData())
// 	.pipe(stringify({
// 		header: true
// 	}))
// 	.pipe(output)
// 	.on('finish', () => console.log('done!'));
//
// interface Flatmap {
// 	[key: string]: Array<FECandidat|Array<FECandidat>>;
// }
//
// interface FECSVRow {
// 	code: number;
// 	FA_ranking_2012: number;
// 	FA_vote_pc_2012: number;
// 	FN_ranking_2012: number;
// 	FN_vote_pc_2012: number;
// 	GRN_ranking_2012: number;
// 	GRN_vote_pc_2012: number;
// 	LF_ranking_2012: number;
// 	LF_vote_pc_2012: number;
// 	LO_ranking_2012: number;
// 	LO_vote_pc_2012: number;
// 	MODEM_ranking_2012: number;
// 	MODEM_vote_pc_2012: number;
// 	NPA_ranking_2012: number;
// 	NPA_vote_pc_2012: number;
// 	REP_ranking_2012: number;
// 	REP_vote_pc_2012: number;
// 	SEP_ranking_2012: number;
// 	SEP_vote_pc_2012: number;
// 	SOC_ranking_2012: number;
// 	SOC_vote_pc_2012: number;
// 	lepen_ranking_2017: number;
// 	lepen_vote_pc_2017: number;
// 	lepen_change_2017: number;
// 	macron_ranking_2017: number;
// 	macron_vote_pc_2017: number;
// 	hamon_ranking_2017: number;
// 	hamon_vote_pc_2017: number;
// 	hamon_change_2017: number;
// 	melenchon_ranking_2017: number;
// 	melenchon_vote_pc_2017: number;
// 	melenchon_change_2017: number;
// 	fillon_ranking_2017: number;
// 	fillon_vote_pc_2017: number;
// 	fillon_change_2017: number;
// }
