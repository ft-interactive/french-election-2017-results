/**
 * French Election 2017 results scraper
 */

import axios from 'axios';
import * as xml2js from 'xml2js';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

export const IS_TEST = process.env.NODE_ENV !== 'production';
export const ENDPOINT = IS_TEST ?
	'http://localhost:8000/' :
	'http://elections.interieur.gouv.fr/telechargements/PR2017/';

export const {
	ROUND = 1, // Set $ROUND to '2' for second round
} = process.env;

/**
 * Convert XML blob into JSON blob
 * This is probably a bit dumb considering I added Cheerio later but... /shrug
 * @param  {string} xmlStr XML string
 * @return {object}        JSON representation of XML
 */
export const convertXML = async (xmlStr: string) => new Promise((resolve, reject) => {
	xml2js.parseString(xmlStr, {
		explicitArray: false,
		normalizeTags: true,
		trim: true,
		explicitRoot: false,
		ignoreAttrs: true,
	}, (err, data) => {
		if (err) reject(err);
		else resolve(data);
	});
});

/**
 * Asynchronously get index from ENDPOINT
 * @return {promise} Promise resolving to JSON representation of index
 */
const getIndex = async () => convertXML((await axios.get(`${ENDPOINT}/resultatsT${ROUND}/index.xml`)).data);

/**
 * Get communes from index, fetch each commune result, combine into object
 * @param  {FEDepartement} d    A departement object from the index file
 * @return {Promise<FEResult>}            Promise resolving to a FEResult object
 */
const fetchResultsDepartement = async (d: FEDepartement) => {
	const urlDepartement = `${ENDPOINT}/resultatsT${ROUND}/${d.codreg3car}/${d.coddpt3car}`;

	try {
		const $ = cheerio.load((await axios.get(`${urlDepartement}/${d.coddpt3car}IDX.xml`)).data);
		const communeIds = $('communes > commune > codsubcom').map(function(i, el) {
			return $(this).text();
		}).toArray();

		const result = await communeIds.reduce(async (queue, id) => {
			try {
				const collection = await queue;
				// console.log(`On ${d.coddpt3car}-${id}`);

				const $$ = cheerio.load((await axios.get(`${urlDepartement}/${d.coddpt3car}${id}.xml`)).data);

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
					com: id,
					votes,
					candidates,
				});

				return collection;
			} catch (ee) {
				console.error(`Error on: ${urlDepartement}/${d.coddpt3car}${id}.xml`);
				return queue;
			}
		}, Promise.resolve([]));

		// try {
		// 	// Backup each departement to JSON in case of failure
		// 	writeFileSync(`./${IS_TEST ? 'test-data/output' : 'data' }/${d.codreg3car}-${d.coddpt3car}.json`, JSON.stringify(result), {encoding: 'utf8'});
		// } catch (e) {
		// 	console.error(`Error writing: ${e}`);
		// 	console.log(result);
		// }

		return result;
	} catch (e) {
		console.error(`Error on: ${urlDepartement}/${d.coddpt3car}IDX.xml`);
		return [];
	}
};

//// Main procedure

getIndex().then(async (data: FEIndex) => {
	return await data.departements.departement.reduce(async (queue, item) => {
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
})
.then(data => {
	console.log('done');
	try {
		writeFileSync(`./${IS_TEST ? 'test-data' : 'data' }/output.json`, JSON.stringify(data), {encoding: 'utf8'});
	} catch (e) {
		console.error(e);
		console.log(data);
	}
});



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
	coddpt: string;
	coddpt3car: string;
	codmindpt: string;
	libdpt: string;
	codreg: string;
	codreg3car: string;
	datedermaj: string;
	heuredermaj: string;
	datederextract: string;
	heurederextract: string;
	complet: string;
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
	[departement: string]: Array<{
		name: string;
		dpt: string;
		com: string;
		reg: string;
		votes: string;
		candidates: Array<FECandidat>;
	}>;
}
