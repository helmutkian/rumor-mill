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
    var stopSimulation = startSimulation();

    socket.on('createNode', () => {
	var node = createNode(nodes.length);
	nodes.push(node);
	node.start();
    });
    
    socket.on('disconnect', () => {
	stopSimulation();

	nodes.forEach(node => {
	    node.stop();
	    ['.push', '.heartbeat', '.set']
		.map(eventType => node.id + eventType)
		.reduce((acc, event) => acc.concat(
		    dispatcher.listeners(event)
			.map(listener => ({ event: event, listener: listener }))
		), [])
		.forEach(eventListener => dispatcher.removeListener(eventListener.event, eventListener.listener));
	});
	nodes = [];
    });

    function createNode(id) {
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

	peers.forEach(peer => {
	    gossip.connectNodes(node.id, nodes[peer].id);
	    gossip.connectNodes(nodes[peer].id, node.id);
	});

	queue(() => {
	    socket.emit('nodeCreated', node);
	});

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


	return node;
    }

    function startSimulation() {
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

	return () => clearInterval(intervalId);
    }
});

function queue(cb) {
    setTimeout(cb, 200);
}

http.listen(3000);
