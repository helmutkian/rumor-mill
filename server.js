var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.send(__dirname + '/public/index.html');
});

app.listen(3000);
