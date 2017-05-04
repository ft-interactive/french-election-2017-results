import * as parse from 'csv-parse';
import * as stringify from 'csv-stringify';
import * as cheerio from 'cheerio';
import {
	readFileSync,
	writeFileSync,
} from 'fs';

async function createGovJSON() {
	const data = readFileSync('./data/listeregdptcom.xml', {encoding: 'utf-8'});
	const output = {};
	const $ = cheerio.load(data);

	const codes = $('commune').map(function(idx, el){
		const comCode = $(this).find('codsubcom').text();
		const comName = $(this).find('libsubcom').text();
		const depName = $(this).parent().siblings('libdpt').text();
		const depCode = $(this).parent().siblings('codmindpt').text();
		const regCode = $(this).parent().parent().parent().siblings('codreg').text();
		const regName = $(this).parent().parent().parent().siblings('libreg').text();
		return {
			code: depCode + comCode,
			comName,
			comCode,
			depName,
			depCode,
			regName,
			regCode,
		};
	}).toArray().reduce((col, cur: any) => {
		col[cur.code] = cur;
		return col;
	}, <any>{});

	writeFileSync('./data/gov-codes.json', JSON.stringify(codes), {encoding: 'utf-8'});
}

async function createInseeJSON() {
	const dataString = readFileSync(__dirname + '/data/latest-qgis.csv', {encoding: 'utf-8'});
	parse(dataString, {columns: true, delimiter: ','}, (err, data) => {
		console.error(err);
		const output = data.map((d: any) => {
			return {
				code: d.insee,
				comName: d.nom,
			};
		})
		.reduce((col: any, cur: any) => {
			col[cur.code] = cur;
			return col;
		}, {});

		writeFileSync('./data/insee-codes.json', JSON.stringify(output), {encoding: 'utf-8'});
	});
}

if (process.argv[2] === 'insee') {
	createInseeJSON();
} else {
	createGovJSON();
}
