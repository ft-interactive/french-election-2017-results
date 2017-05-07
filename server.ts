import * as express from 'express';
const s3oAuth = require('@financial-times/s3o-middleware');

const app = express();

app.use(s3oAuth);
app.use(express.static('data'));

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
