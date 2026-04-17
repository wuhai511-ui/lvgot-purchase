const express = require('express');
const path = require('path');
const app = express();

app.use('/test', express.static(path.join(__dirname, 'tools')));

app.listen(3333, () => {
  console.log('Test server on port 3333');
});
