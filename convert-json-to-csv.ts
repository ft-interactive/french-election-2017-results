/**
 * Convert the script's output from JSON to CSV
 */

import * as stringify from 'csv-stringify';
import * as parse from 'csv-parse';

import {
	createReadStream,
	createWriteStream,
	readFileSync
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
const spreadsheet = createReadStream('./data/results-spreadsheet-template.csv');
const output = createWriteStream('./data/complete.csv');

// Import our JSON file and flatten it into an object indexed by departement + commune code.
const results: FEResult = require('./output.json');
const resultsFlat = Object.keys(results).reduce((col, key) => {
	results[key].forEach(item => {
		// Sort it by number of votes to get outcome order.
		col[`${item.dpt}${item.com}`] = item.candidates.sort((a, b) => Number(a.nbvoix) - Number(b.nbvoix));
	});

	return col;
}, <Flatmap>{});

// Quick Transform stream for adding data to the result template
export class AddElectionData extends Transform {
	constructor(options: any = {}) {
		options.objectMode = true;
		super(options);
	}

	_transform(_data: FECSVRow, encoding: string, cb: Function) {
		const data = Object.assign({}, _data);
		const candidates = resultsFlat[data.code]; // @TODO double-check the code in spreadsheet matches

		// Rankings
		data.lepen_ranking_2017       = candidates.findIndex(d => d.nompsn === 'LE PEN') + 1;
		data.macron_ranking_2017      = candidates.findIndex(d => d.nompsn === 'MACRON') + 1;
		data.hamon_ranking_2017       = candidates.findIndex(d => d.nompsn === 'HAMON') + 1;
		data.melenchon_ranking_2017   = candidates.findIndex(d => d.nompsn === 'MÉLENCHON') + 1;
		data.fillon_ranking_2017      = candidates.findIndex(d => d.nompsn === 'FILLON') + 1;

		// Vote % (decimal)
		data.lepen_vote_pc_2017       = Number(candidates.find(d => d.nompsn === 'LE PEN').rapportexprime.replace(',', '.'));
		data.macron_vote_pc_2017      = Number(candidates.find(d => d.nompsn === 'MACRON').rapportexprime.replace(',', '.'));
		data.hamon_vote_pc_2017       = Number(candidates.find(d => d.nompsn === 'HAMON').rapportexprime.replace(',', '.'));
		data.melenchon_vote_pc_2017   = Number(candidates.find(d => d.nompsn === 'MÉLENCHON').rapportexprime.replace(',', '.'));
		data.fillon_vote_pc_2017      = Number(candidates.find(d => d.nompsn === 'FILLON').rapportexprime.replace(',', '.'));

		// Changes
		data.lepen_change_2017        = Number(candidates.find(d => d.nompsn === 'LE PEN').rapportexprime.replace(',', '.')) - data.lepen_change_2017;
		data.hamon_change_2017        = Number(candidates.find(d => d.nompsn === 'HAMON').rapportexprime.replace(',', '.')) - data.hamon_change_2017;
		data.melenchon_change_2017    = Number(candidates.find(d => d.nompsn === 'MÉLENCHON').rapportexprime.replace(',', '.')) - data.melenchon_change_2017;
		data.fillon_change_2017       = Number(candidates.find(d => d.nompsn === 'FILLON').rapportexprime.replace(',', '.')) - data.fillon_change_2017;

		cb(null, data);
	}
}

// Finally start piping stuff

spreadsheet
	.pipe(parse({columns: true}))
	.pipe(new AddElectionData())
	.pipe(stringify({
		header: true
	}))
	.pipe(output)
	.on('finish', () => console.log('done!'));

interface Flatmap {
	[key: string]: Array<FECandidat>;
}

interface FECSVRow {
	code: number;
	FA_ranking_2012: number;
	FA_vote_pc_2012: number;
	FN_ranking_2012: number;
	FN_vote_pc_2012: number;
	GRN_ranking_2012: number;
	GRN_vote_pc_2012: number;
	LF_ranking_2012: number;
	LF_vote_pc_2012: number;
	LO_ranking_2012: number;
	LO_vote_pc_2012: number;
	MODEM_ranking_2012: number;
	MODEM_vote_pc_2012: number;
	NPA_ranking_2012: number;
	NPA_vote_pc_2012: number;
	REP_ranking_2012: number;
	REP_vote_pc_2012: number;
	SEP_ranking_2012: number;
	SEP_vote_pc_2012: number;
	SOC_ranking_2012: number;
	SOC_vote_pc_2012: number;
	lepen_ranking_2017: number;
	lepen_vote_pc_2017: number;
	lepen_change_2017: number;
	macron_ranking_2017: number;
	macron_vote_pc_2017: number;
	hamon_ranking_2017: number;
	hamon_vote_pc_2017: number;
	hamon_change_2017: number;
	melenchon_ranking_2017: number;
	melenchon_vote_pc_2017: number;
	melenchon_change_2017: number;
	fillon_ranking_2017: number;
	fillon_vote_pc_2017: number;
	fillon_change_2017: number;
}
