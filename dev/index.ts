import * as fs from 'fs';
import * as express from 'express';
import { Piffero } from '../src/piffero2';

const app: express.Application = express();

app.get('/favicon.ico',  (req, res) => {
    res.sendStatus(404);
});

app.get('/:path',  (req, res) => {

    const path = req.params.path;

    const stream: fs.ReadStream = fs.createReadStream('./spec/jsonFiles/john-doe.json');
    
    const result = Piffero.findPath(stream, path);

    res.setHeader('Content-Type', 'application/json');
    result.pipe(res);
});

app.listen(3000, () => {
    console.log('Open your browser at: http://localhost:3000/$.phoneNumbers[1]');
});