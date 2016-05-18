var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var EventEmitter = require('events');
var dispatcher = new EventEmitter();
var gossip = require('./gossip')(dispatcher);

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.send(__dirname + '/public/index.html');
});

io.on('connect', function (socket) {
    var nodes = [];
    

    socket.on('createNode', () => {
	var id = nodes.length;
	var node = gossip.createNode(id);
	var numPeers = Math.floor((Math.random() * (Math.ceil(nodes.length / 2) - 1)) + 1);
	var peers = [];
	var index;
	
	while (peers.length < numPeers) {
	    index = Math.floor(Math.random() * nodes.length);
	    if (index != id && peers.indexOf(index) < 0) {
		peers.push(index);
	    }
	}

	dispatcher.on(node.id + '.push', payload => {
	    queue(() => {
		socket.emit(node.id + '.push', {
		    sender: payload.sender,
		    state: node.state
		});
	    });
	});

	dispatcher.on(node.id + '.set', payload => {
	    queue(() => { 
		socket.emit(node.id + '.set', payload);
	    });
	});

	nodes.push(node);

	peers.forEach(peer => {
	    gossip.connectNodes(node.id, nodes[peer].id);
	    gossip.connectNodes(nodes[peer].id, node.id);
	});

	queue(() => {
	    socket.emit('nodeCreated', node);
	});

	node.start();
    });


    socket.on('disconnect', () => {
	clearInterval(intervalId);
	nodes.forEach(node => node.stop());
	nodes = [];
    });

    var iteration = 0;

    var intervalId = setInterval(() => {
	var index = Math.floor(Math.random() * nodes.length);

	if (nodes.length) {
	
	    gossip.setState(nodes[index].id, { key: 'color', value: iteration });
	    
	    if (iteration >= 10) {
		iteration = 0;
	    } else {
		iteration++;
	    }
	}
    }, Math.floor((Math.random() * (2000 - 200)) + 200));
});

function queue(cb) {
    setTimeout(cb, 200);
}

http.listen(3000);
