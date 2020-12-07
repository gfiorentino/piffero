import * as fs from 'fs';
import * as express from 'express';
import { Piffero } from '../src/piffero';
import {getPath} from './multiworker';

const app: express.Application = express();

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => console.log(req.path + ' in', Date.now() - start, 'ms'));
    next();
}); 

app.get('/favicon.ico',  (req, res) => {
    res.sendStatus(404);
});

app.get('/:path',  (req, res) => {

    const path = req.params.path;

   const stream: fs.ReadStream = fs.createReadStream('./spec/jsonFiles/large-file.json');
    
    const result = Piffero.findByPath(stream, path);

    res.setHeader('Content-Type', 'application/json');
    result.pipe(res);
});

app.get('/worker/:path',  (req, res) => {
    getPath(req,res);
});

app.listen(3000, () => {
    console.log('Open your browser at: http://localhost:3000/$[1].payload');
});