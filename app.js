const axios = require('axios');
const express = require('express');
const http = require('http');
const cors = require('cors');
const apicache = require('apicache');

const COLLECTION = 'https://openactive.io/data-catalogs/data-catalog-collection.jsonld';

let datasets = {};
var rpdeLengthMap = {};

const app = express();
app.use(express.json());
app.use(cors());

let cache = apicache.middleware

// ** Passthrough RPDE fetch **
// TODO: Restrict with cors and to RPDE only
app.get('/fetch', cache('5 minutes'), async(req, res, next) => {
  const page = await axios.get(req.query.url);
  res.status(200).send(page.data);
});

// ** Store RPDE length ** 
app.post('/rpde-feed-length', function(req, res) {
  if (req.body.feed && req.body.length) {
    rpdeLengthMap[req.body.feed] = req.body.length;
  }
  res.status(201).send();
});

app.get('/rpde-feed-length', function (req, res) {
    res.send(rpdeLengthMap);
});

// ** Cache dataset URLs ** 
// TODO: refresh nightly
(async () => {
  try {
    // Get all datasets on load
    const collection = await axios.get(COLLECTION);
    if (collection.data.hasPart) {
      datasets = (await Promise.all(collection.data.hasPart.map(url => axios.get(url)))).flatMap(x => x.data.dataset);
    } else {
      throw new Error('Could not connect to https://openactive.io/data-catalogs/data-catalog-collection.jsonld')
    }
  } catch (error) {
    console.error(error.stack);
    process.exit(1);
  }
})();

app.get('/datasets', function (req, res) {
  res.send(datasets);
});


// ** Error handling ** 

app.use(function (err, req, res, next) {
    res.status(500).json({error: err.stack})
    console.error(err.stack);
})

const server = http.createServer(app);
server.on('error', onError);

const port = normalizePort(process.env.PORT || '3000');
app.listen(port, () => {
  console.log(`Server running on port ${port}
`);

});

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const integerPort = parseInt(val, 10);

  if (Number.isNaN(integerPort)) {
    // named pipe
    return val;
  }

  if (integerPort >= 0) {
    // port number
    return integerPort;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? `Pipe ${port}`
    : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}
