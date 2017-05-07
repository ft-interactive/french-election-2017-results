/**
 * French Election 2017 results scraper
 */

import axios from 'axios';
import * as xml2js from 'xml2js';
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync } from 'fs';
const { remove } = require('diacritics');
import { unparse as stringify } from 'babyparse';
import * as parse from 'csv-parse';

const translationTable = require('./data/government-to-insee.json');

export const IS_TEST = process.env.NODE_ENV !== 'production';
export const IS_LOCAL = process.env.hasOwnProperty('IS_LOCAL') ? process.env.IS_LOCAL : true;
export const ENDPOINT = 'http://elections.interieur.gouv.fr/telechargements/PR2017/';
export const ROUND: number = process.env.ROUND || 1; // Set $ROUND to '2' for second roundprocess.env;

export const acquire = async (filepath: string) => {
	if (IS_LOCAL) return readFileSync(`${__dirname}/${IS_TEST ? 'test-data' : 'results/elections.interieur.gouv.fr/telechargements/PR2017'}/resultatsT${ROUND}/${filepath}`, 'utf-8');
	else return (await axios.get(`${ENDPOINT}/resultatsT${ROUND}/${filepath}`)).data;
};

/**
 * Get communes from index, fetch each commune result, combine into object
 * @param  {FEDepartement} d    A departement object from the index file
 * @return {Promise<FEResult>}            Promise resolving to a FEResult object
 */
export const fetchResultsDepartement = async (d: FEDepartement) => {
	if (d.codreg3car === '000' && d.coddpt3car === '099') return; // Ignore overseas
	const filePath = `${d.codreg3car}/${d.coddpt3car}`;

	try {
		const $ = cheerio.load(await acquire(`${filePath}/${d.coddpt3car}IDX.xml`));
		const communeIds = $('communes > commune > codsubcom').map(function(i, el) {
			return $(this).text();
		}).toArray();

		const result = await communeIds.reduce(async (queue, id) => {
			try {
				const combinedCode = d.coddpt + String(id);
				const translatedId = translationTable[combinedCode];
				const collection = await queue;
				// console.log(`On ${d.coddpt3car}-${id}`);

				const $$ = cheerio.load(await acquire(`${filePath}/${d.coddpt3car}${id}.xml`));
				const tour = $$(`tours > tour > numtour:contains(${ROUND})`).parent();
				const candidates = $$(`resultats > candidats > candidat`, tour).map(function(){
					return $$(this).children().toArray().reduce((coll, child) => {
						coll[child.tagName] = $$(child).text().trim();
						return coll;
					}, <FECandidat>{});
				}).toArray();

				const registered_voters = Number($$(`tours > tour:contains(${ROUND}) > mentions > inscrits > nombre`).text()); // Formerly "electorate"
				const ballots_cast = Number($$(`tours > tour:contains(${ROUND}) > mentions > votants > nombre`).text()); // Formerly "registered_voters"
				const abstaining_voters = Number($$(`tours > tour:contains(${ROUND}) > mentions > abstentions > nombre`).text());
				const blank_ballots = Number($$(`tours > tour:contains(${ROUND}) > mentions > blancs > nombre`).text());
				const spoiled_ballots = Number($$(`tours > tour:contains(${ROUND}) > mentions > nuls > nombre`).text());
				const valid_ballots = Number($$(`tours > tour:contains(${ROUND}) > mentions > exprimes > nombre`).text());

				collection.push({
					code: translatedId,
					name: $$('libsubcom').text(),
					reg: d.codreg,
					dpt: d.codmindpt,
					com: id,
					registered_voters,
					abstaining_voters,
					ballots_cast,
					blank_ballots,
					spoiled_ballots,
					valid_ballots,
					candidates,
				});

				return collection;
			} catch (ee) {
				console.error(`Error on: ${filePath}/${d.coddpt3car}${id}.xml`);
				return queue;
			}
		}, Promise.resolve([]));
		return result;
	} catch (e) {
		console.dir(e);
		console.error(`Error on: ${filePath}/${d.coddpt3car}IDX.xml`);
		return [];
	}
};

//// Main procedure
export async function run() {
	(async () => {
		const $ = cheerio.load(await acquire(`index.xml`));
		return $('departement').toArray().map((d, i) => {
			return {
				coddpt3car: $(d).find('coddpt3car').text(),
				coddpt: $(d).find('coddpt').text(),
				codmindpt: $(d).find('codmindpt').text(),
				codreg3car: $(d).find('codreg3car').text(),
				codreg: $(d).find('codreg').text(),
			};
		}).reduce(async (queue, item) => {
			try {
				const collection = await queue;
				console.info(`On ${item.coddpt}`);
				collection[item.coddpt] = await fetchResultsDepartement(item);
				return collection;
			} catch (e) {
				console.error(`Error on departement: ${item.coddpt3car}`);
				return queue;
			}
		}, Promise.resolve<FEResult>({}));
	})()
		.then(data => {
			try {
				writeFileSync(`./${IS_TEST ? 'test-data' : 'data' }/output.json`, JSON.stringify(data), {encoding: 'utf8'});
				const flatmap = createFlatMap(data);
				generateResultsCSV(flatmap);
				generateExtendedResultsCSV(flatmap);
			} catch (e) {
				console.error(e);
			}
		});
}

export function createFlatMap(results: FEResult) {
	return Object.keys(results)
	.reduce((col, key) => {
		if (!results[key]) return col;
		try {
			results[key].forEach(item => {
				const candidatesSorted = item.candidates.sort((a, b) => Number(b.nbvoix) - Number(a.nbvoix));
				col[item.code] = {
					candidates: candidatesSorted,
					data: {
						ballots_cast: item.ballots_cast,
						registered_voters: item.registered_voters,
						abstaining_voters: item.abstaining_voters,
						blank_ballots: item.blank_ballots,
						spoiled_ballots: item.spoiled_ballots,
						valid_ballots: item.valid_ballots,
					},
				};
			});

			return col;
		} catch (e) {
			console.log(`Issue with ${key}`);
			console.error(e);
			return col;
		}
	}, <Flatmap>{});
}

export function generateResultsCSV(data: Flatmap) {
	const items = Object.entries(data).map(([code, commune]) => {
		const candidates = commune.candidates;  // .sort((a, b) => Number(b.nbvoix) - Number(a.nbvoix)); // Removing sort as is done in Flatmap.
		return candidates.reduce((c, d, i, a) => {
			const name: string = remove(d.nompsn).replace(/\s/g, '');
			c[`${name}_ranking_2017`] = ROUND === 2 ? checkRanking(d, a) : i + 1;
			c[`${name}_vote_pc_2017`] = Number(d.rapportexprime.replace(',', '.'));
			c[`${name}_vote_count_2017`] = Number(d.nbvoix);
			return c;
		}, <FECSVRow>{
			code,
		});
	});

	const output = stringify(items, {
		header: true,
	});
	writeFileSync(`./${IS_TEST ? 'test-data' : 'data'}/winners_round_${ROUND}.json`, JSON.stringify(items));
	writeFileSync(`./${IS_TEST ? 'test-data' : 'data'}/winners_round_${ROUND}.csv`, output, {encoding: 'utf8'});
}

export function checkRanking(datum: FECandidat, arr: FECandidat[]) {
	const idx = arr.findIndex(d => d.npmpsn === datum.nompsn);
	if (idx === 0) {
		return arr[idx + 1].nbvoix === datum.nbvoix ? 'tie' : 'win';
	} else {
		return arr[idx - 1].nbvoix === datum.nbvoix ? 'tie' : 'lose';
	}
}

export function generateExtendedResultsCSV(data: Flatmap) {
	const items = Object.entries(data).map(([code, commune]) => {
		const candidates = commune.candidates;  // .sort((a, b) => Number(b.nbvoix) - Number(a.nbvoix)); // Removing sort as is done in Flatmap.
		return candidates.reduce((c, d, i, a) => {
			const name: string = remove(d.nompsn).replace(/\s/g, '');
			c[`${name}_ranking_2017`] = ROUND === 2 ? checkRanking(d, a) : i + 1;
			c[`${name}_vote_pc_2017`] = Number(d.rapportexprime.replace(',', '.'));
			c[`${name}_vote_count_2017`] = Number(d.nbvoix);
			return c;
		}, <FECSVRow>{
			code,
			ballots_cast: commune.data.ballots_cast,
			registered_voters: commune.data.registered_voters,
			abstaining_voters: commune.data.abstaining_voters,
			blank_ballots: commune.data.blank_ballots,
			spoiled_ballots: commune.data.spoiled_ballots,
			valid_ballots: commune.data.valid_ballots,
				});
	});
	const output = stringify(items, {
		header: true,
	});
	writeFileSync(`./${IS_TEST ? 'test-data' : 'data'}/winners_round_${ROUND}--extended-data.json`, JSON.stringify(items));
	writeFileSync(`./${IS_TEST ? 'test-data' : 'data'}/winners_round_${ROUND}--extended-data.csv`, output, {encoding: 'utf8'});
}

if (process.argv.length > 1 && process.argv[2] === 'run') run();

// Interfaces

export interface FEIndex {
	scrutin: {
		type: string;
		annee: string;
	};
	departements: {
		departement: Array<FEDepartement>;
	};
	regions: {
		region: Array<FERegion>;
	};
}

export interface FEDepartement {
	coddpt3car: string;
	coddpt: string;
	codmindpt: string;
	codreg: string;
	codreg3car: string;
}

export interface FERegion {
	codreg: string;
	codreg3car: string;
	libreg: string;
	datedermaj: string;
	heuredermaj: string;
	datederextract: string;
	heurederextract: string;
	complet: string;
}

export interface FECandidat {
	numpanneaucand: string;
	nompsn: string;
	prenompsn: string;
	civilitepsn: string;
	nbvoix: string;
	rapportexprime: string;
	rapportinscrit: string;
	[key: string]: string;
}

export interface FEResult {
	[departement: string]: Array<FECommune>;
}

export interface FECommune {
	code: string;
	name: string;
	dpt: string;
	com: string;
	reg: string;
	registered_voters: number;
	abstaining_voters: number;
	blank_ballots: number;
	spoiled_ballots: number;
	valid_ballots: number;
	ballots_cast: number;
	candidates: Array<FECandidat>;
}

interface Flatmap {
	[key: string]: {
		candidates: Array<FECandidat>;
		data: {
			registered_voters: number;
			abstaining_voters: number;
			blank_ballots: number;
			spoiled_ballots: number;
			valid_ballots: number;
			ballots_cast: number;
		}
	};
}

interface FECSVRow {
	[key: string]: string|number;
	code: string;
	registered_voters: number;
	abstaining_voters: number;
	blank_ballots: number;
	spoiled_ballots: number;
	valid_ballots: number;
	ballots_cast: number;
}
