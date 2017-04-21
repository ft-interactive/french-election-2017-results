import {
	FEIndex,
	FERegion,
	ENDPOINT,
	ROUND,
	convertXML,
} from './index';

import axios from 'axios';

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

/**
 * @param  {FERegion} r [description]
 * @return {[type]}     [description]
 */
const fetchResultsRegion = async (r: FERegion) => {
	const url = `${ENDPOINT}/resultatsT${ROUND}/${r.codreg3car}/${r.codreg3car}.xml`;
	const data = (await axios.get(url)).data;
	return await convertXML(data);
};
