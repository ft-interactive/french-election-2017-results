/**
 * French Election 2017 results scraper
 */

import axios from 'axios';
import * as xml2js from 'xml2js';
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync } from 'fs';
const {remove} = require('diacritics');
import * as stringify from 'csv-stringify';
import * as parse from 'csv-parse';

const translationTable = require('./data/government-to-insee.json');

export const IS_TEST = process.env.NODE_ENV !== 'production';
export const ENDPOINT = 'http://elections.interieur.gouv.fr/telechargements/PR2017/';
export const {
	ROUND = 1, // Set $ROUND to '2' for second round
} = process.env;

export const acquire = async (filepath: string) => {
	if (IS_TEST) return readFileSync(`${__dirname}/scrape/elections.interieur.gouv.fr/telechargements/PR2017/resultatsT${ROUND}/${filepath}`, 'utf-8');
	else return (await axios.get(`${ENDPOINT}/resultatsT${ROUND}/${filepath}`)).data;
};

/**
 * Get communes from index, fetch each commune result, combine into object
 * @param  {FEDepartement} d    A departement object from the index file
 * @return {Promise<FEResult>}            Promise resolving to a FEResult object
 */
const fetchResultsDepartement = async (d: FEDepartement) => {
	if (d.codreg3car === '000' && d.coddpt3car === '099') return; // Ignore overseas
	const filePath = `${d.codreg3car}/${d.coddpt3car}`;

	try {
		const $ = cheerio.load(await acquire(`${filePath}/${d.coddpt3car}IDX.xml`));
		const communeIds = $('communes > commune > codsubcom').map(function(i, el) {
			return $(this).text();
		}).toArray();

		const result = await communeIds.reduce(async (queue, id) => {
			const translatedId = translationTable.hasOwnProperty(String(id)) ? translationTable[String(id)] : String(id);
			try {
				const collection = await queue;
				// console.log(`On ${d.coddpt3car}-${id}`);

				const $$ = cheerio.load(await acquire(`${filePath}/${d.coddpt3car}${id}.xml`));

				const candidates = $$('candidats > candidat').map(function(){
					return $$(this).children().toArray().reduce((coll, child) => {
						coll[child.tagName] = $$(child).text().trim();
						return coll;
					}, <FECandidat>{});
				}).toArray();

				const votes = Number($$('mentions > inscrits > nombre').text()) - Number($$('mentions > abstentions > nombre').text());

				collection.push({
					name: $$('libsubcom').text(),
					reg: d.codreg,
					dpt: d.codmindpt,
					com: translatedId,
					votes,
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
(async () => {
	const $ = cheerio.load(await acquire(`index.xml`));
	return $('departement').toArray().map((d, i) => {
		return {
			coddpt3car: $(d).find('coddpt3car').text(),
			// coddpt: $(d).find('coddpt').text(),
			codmindpt: $(d).find('codmindpt').text(),
			// libdpt: $(d).find('libdpt').text(),
			codreg3car: $(d).find('codreg3car').text(),
			codreg: $(d).find('codreg').text(),
		};
	}).reduce(async (queue, item) => {
		try {
			const collection = await queue;
			console.info(`On ${item.coddpt3car}`);
			collection[item.coddpt3car] = await fetchResultsDepartement(item);
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
		} catch (e) {
			console.error(e);
		}
	});

// getIndex().then(async (data: FEIndex) => {
// 	return await data.departements.departement.reduce(async (queue, item) => {
// 		try {
// 			const collection = await queue;
// 			console.info(`On ${item.coddpt3car}`);
// 			collection[item.coddpt3car] = await fetchResultsDepartement(item);
// 			return collection;
// 		} catch (e) {
// 			console.error(`Error on departement: ${item.coddpt3car}`);
// 			return queue;
// 		}
// 	}, Promise.resolve<FEResult>({}));
// })
// .then(data => {
// 	try {
// 		writeFileSync(`./${IS_TEST ? 'test-data' : 'data' }/output.json`, JSON.stringify(data), {encoding: 'utf8'});
// 		const flatmap = createFlatMap(data);
// 		generateResultsCSV(flatmap);
// 	} catch (e) {
// 		console.error(e);
// 	}
// });

function createFlatMap(results: FEResult) {
	return Object.keys(results)
	.reduce((col, key) => {
		if (!results[key]) return col;
		try {
			results[key].forEach(item => {
				col[`${item.dpt}${item.com}`] = item.candidates.sort((a, b) => Number(a.nbvoix) - Number(b.nbvoix));
			});

			return col;
		} catch (e) {
			console.log(`Issue with ${key}`);
			console.error(e);
			return col;
		}
	}, <Flatmap>{});
}

function generateResultsCSV(data: Flatmap) {
	const items = Object.entries(data).map(([code, _candidates]) => {
		const candidates = _candidates.sort((a, b) => Number(b.nbvoix) - Number(a.nbvoix));
		return candidates.reduce((c, d, i) => {
			const name: string = remove(d.nompsn).replace(/\s/g, '');
			c[`${name}_ranking_2017`] = i + 1;
			c[`${name}_vote_pc_2017`] = Number(d.rapportexprime.replace(',', '.'));
			return c;
		}, <FECSVRow>{
			code,
		});
	});

	const rows = items.map(Object.values);
	const columns = Object.keys(items[0]);

	stringify(rows, {
		header: true,
		columns,
	}, (err: Error, parsed: string) => {
		console.error(err);
		writeFileSync('./data/winners.csv', parsed, {encoding: 'utf8'});
	});
}

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
	// coddpt: string;
	coddpt3car: string;
	codmindpt: string;
	// libdpt: string;
	codreg: string;
	codreg3car: string;
	// datedermaj: string;
	// heuredermaj: string;
	// datederextract: string;
	// heurederextract: string;
	// complet: string;
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
	name: string;
	dpt: string;
	com: string;
	reg: string;
	votes: string;
	candidates: Array<FECandidat>;
}

interface Flatmap {
	[key: string]: Array<FECandidat>;
}

interface FECSVRow {
	[key: string]: string|number;
	code: string;
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
