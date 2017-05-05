/**
 * Create a translation table
 */

const insee = require('./data/insee-codes.json');
const gov   = require('./data/gov-codes.json');
const {compareTwoStrings: compare} = require('string-similarity');
const {remove} = require('diacritics');
const {writeFileSync} = require('fs');
const assert = require('assert');
const stringify = require('csv-stringify');

const unmatched0: string[] = [];
const unmatched1: string[] = [];
const unmatched2: string[] = [];
const unmatched3: string[] = [];
const unmatched4: string[] = [];
const lowDiceScore: string[] = [];

console.log(`Total, Ministère Interieur dataset: ${Object.keys(gov).length}`);
console.log(`Total, INSEE dataset: ${Object.keys(insee).length}`);

const govToInsee = Object.entries(gov).reduce((gov: any, [code, data]) => {
	const normalised = remove(data.comName).toUpperCase();

	// Strategy 0: Non renseigné (excluded from dataset as have no INSEE code)
	if (data.regName === 'Non renseigné') return gov;
	else unmatched0.push(code);

	// Strategy 1: straight 1:1 mapping
	if (insee.hasOwnProperty(code)) {
		gov[code] = insee[code].code;

		checkScore(insee[code].comName, normalised, code);

		return gov;
	} else {
		unmatched1.push(code);
	}

	// Strategy 2: remove first digit of departement code
	const newCode = String(data.depCode) + String(data.comCode.slice(1));
	if (insee.hasOwnProperty(newCode)) {
		gov[code] = insee[newCode].code;

		checkScore(insee[newCode].comName, normalised, code);

		return gov;
	} else {
		unmatched2.push(code);
	}

	let replaced = '';
	// Strategy 3: Handle metropolitan areas separately
	switch (data.depCode) {
		case '75': // Paris arrondisements
			replaced = data.depCode + data.comCode.replace('056AR', '1');
			/*if (code === '75056') { // "Capitale d'état"
			console.log('PARIS');
				gov[code] = '75101';

				return gov;
			} else */
			if (insee.hasOwnProperty(replaced)) {
				gov[code] = replaced;

				checkScore(insee[replaced].comName, normalised, code);

				return gov;
			} else {
				unmatched3.push(code);
				return gov;
			}

		case '69': // Rhône
			replaced = data.depCode + data.comCode.replace('123AR0', '38');

			if (code === '69123') { // Lyon "Préfecture de région"
				gov[code] = '69381';

				return gov;
			} else if (insee.hasOwnProperty(replaced)) {

				gov[code] = replaced;

				checkScore(insee[replaced].comName, normalised, code);

				return gov;
			} else {
				unmatched3.push(code);
				return gov;
			}

		case '13': // Bouches-du-Rhône
			replaced = data.depCode + data.comCode.replace('055AR', '2');
			if (code === '13055') { // Marseille "Préfecture de région"
				gov[code] = '13201';

				return gov;
			} else if (insee.hasOwnProperty(replaced)) {
				gov[code] = replaced;

				checkScore(insee[replaced].comName, normalised, code);

				return gov;
			} else if (data.comCode.match('SR')) { // Marseille secteurs have no INSEE code; discard.
				return gov;
			} else {
				unmatched3.push(code);
				return gov;
			}

		default:
			unmatched3.push(code);
	}

	// Strategy 4: Missing from the INSEE dataset I've used. Codes validate via insee.fr
	switch (code) {
		case '55138': // "Culey"
		case '76095': // "Bihorel"
		case '76601': // "Saint-Lucien"
			gov[code] = code;
			return gov;
		default:
			unmatched4.push(code);
	}

	return gov;
}, {});

function checkScore(_string1: string, string2: string, code: string) {
	const string1 = remove(_string1).toUpperCase();
	try {
		const dice = compare(string1, string2).toFixed(2);
		assert(
			dice > 0.4,
			`Low Dice coefficient (${dice}) for ${code} (${string1} vs ${string2})`
		);
	} catch (e) {
		console.log(e.message);
		lowDiceScore.push(code);
	}
}

console.log('------');
console.log(`Found in stage 0: ${Object.keys(gov).length - unmatched0.length}`);
console.log(`Found in stage 1: ${unmatched0.length - unmatched1.length}`);
console.log(`Found in stage 2: ${unmatched1.length - unmatched2.length}`);
console.log(`Found in stage 3: ${unmatched2.length - unmatched3.length}`);
console.log(`Found in stage 4: ${unmatched3.length - unmatched4.length}`);
console.log(`Remaining: ${unmatched4.length}`);
console.dir(unmatched4);

writeFileSync(`${__dirname}/data/government-to-insee.json`, JSON.stringify(govToInsee), {encoding: 'utf-8'});
writeFileSync(`${__dirname}/data/dubious-codes.json`, JSON.stringify(lowDiceScore), {encoding: 'utf-8'});

const tableEntries = Object.entries(govToInsee);
tableEntries.unshift(['ministere interieur', 'insee']);
stringify(tableEntries,
	{header: true}, (err: Error, data: string) => {
	writeFileSync(`${__dirname}/data/code-translation-table.csv`, data, {encoding: 'utf-8'});
	console.log('done!');
});

//////// TypeScript def stubs
declare module 'string-similarity';
declare module 'diacritics';
