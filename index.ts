/**
 * French Election 2017 results scraper
 */

import axios from 'axios';
import * as xml2js from 'xml2js';

const ENDPOINT = process.env.NODE_ENV !== 'production' ?
	'http://www.interieur.gouv.fr/avotreservice/elections/telechargements/EssaiPR2017' :
	'http://elections.interieur.gouv.fr/telechargements/PR2017/';

const {
	ROUND = 1,
} = process.env;

/**
 * Convert XML blob into JSON blob
 * @param  {string} xmlStr XML string
 * @return {object}        JSON representation of XML
 */
const convertXML = async (xmlStr) => new Promise((resolve, reject) => {
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
 * Diff two indices to get the updated regions and departements
 * @param  {FEIndex} lastIdx     The last index used for fetching
 * @param  {FEIndex} currentIdx  The new index to diff against
 * @return {object}              Diffed version of indices
 */
const diffIndices = (lastIdx: FEIndex, currentIdx: FEIndex) => {
	const { departements: departementsOld, regions: regionsOld } = lastIdx;
	const { departements: departementsNew, regions: regionsNew } = currentIdx;

	const updatedDepartements = departementsNew.departement.map((d) => {
		const old = departementsOld.departement.find(oldD => oldD.coddpt + oldD.codreg === d.coddpt + d.codreg);

		const lastUpdatedNew = new Date(`${d.datederextract}T${d.heurederextract}`);
		const lastUpdatedOld = new Date(`${old.datederextract}T${old.heurederextract}`);

		return lastUpdatedNew > lastUpdatedOld ? d : undefined;
	}).filter(i => i);


	const updatedRegions = regionsNew.region.map((region) => {
		const old = regionsOld.region.find(oldD => oldD.codreg === region.codreg);

		const lastUpdatedNew = new Date(`${region.datederextract}T${region.heurederextract}`);
		const lastUpdatedOld = new Date(`${old.datederextract}T${old.heurederextract}`);

		return lastUpdatedNew > lastUpdatedOld ? region : undefined;
	}).filter(i => i);

	return {
		departements: {
			departement: updatedDepartements,
		},
		regions: {
			region: updatedRegions,
		},
	};
};

const fetchResultsDepartement = async (d: FEDepartement) => {
	const urlDepartement = `${ENDPOINT}/resultatsT${ROUND}/${d.codreg3car}/${d.coddpt3car}`;
	const summaryData = await convertXML((await axios.get(`${urlDepartement}/${d.coddpt3car}.xml`)).data);
	const idxDepartement = await convertXML((await axios.get(`${urlDepartement}/${d.coddpt3car}IDX.xml`)).data);

	return {
		departement: summaryData,
		communes: await fetchResultsCommune
	}
};

const fetchResultsRegion = async (r: FERegion) => {
	const url = `${ENDPOINT}/resultatsT${ROUND}/${r.codreg3car}/${r.codreg3car}.xml`;
	const data = (await axios.get(url)).data;
	return await convertXML(data);
};

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
