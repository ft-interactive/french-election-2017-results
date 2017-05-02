## French Election data stuff

*The codes used by Ministère Interieur are different from INSEE!*

### To generate a translation table:

1. Run `npm run create-code-jsons`

This assumes data/ contains a file called latest-qgis.csv, which is made by exporting
to CSV the communes shapefile from https://www.data.gouv.fr/fr/datasets/decoupage-administratif-communal-francais-issu-d-openstreetmap/

You also need listeregdptcom.xml in data/.

2. Run `npm run create-translation-table`

This will create code-translation-table.csv and government-to-insee.json

### To generate output

1. wget mirror the results endpoint:

```
wget --mirror --no-parent http://elections.interieur.gouv.fr/telechargements/PR2017/
```

2. Run `npm start` to generate output JSON blob

3. Run `npm run create-winners-csv` to generate winners output CSV
