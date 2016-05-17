function gossip(dispatcher) {

    return {
	createNode: createNode,
	connectNodes: connectNodes,
	setState: setState
    };
    
    function createNode(id) {
	var state = {};
	var peers = {};
	var sources = {};
	var timeoutId = null;
	var sampleSize = 3;
	var interval = 200;
	var node = {
	    start: start,
	    stop: stop
	};

	Object.defineProperties(node, {
	    id: { get: () => id },
	    peers: { get: () => Object.keys(peers).filter(peer => peers[peer]) },
	    state: { get: () => state },
	    sampleSize: { get: () => sampleSize, set: value => sampleSize = value },
	    interval: { get: () => interval, set: value => interval = value }
	});

	dispatcher.on(id + '.heartbeat', peer => peers[peer] = true);
	
	dispatcher.on(id + '.set', data => set(data));


	return node;

	function start() {
	    dispatcher.on(id + '.push', payload => {
		sources[payload.sender] = true;
		reconcile(payload.state);
	    });

	    cycle();
	}

	function stop() {
	    clearTimeout(timeoutId);	    
	}

	function set(data) {
	    state[data.key] = {
		value: data.value,
		version: new Date()
	    };
	}
	
	function cycle() {
	    timeoutId = setTimeout(() => {
		sendHeartbeat();
		pushState();		
		cycle();
	    }, interval);
	}

	function sendHeartbeat() {
	    Object.keys(sources)
		.filter(source => sources[source])
		.forEach(source => {
		    dispatcher.emit(source + '.heartbeat', id);
		    sources[source] = false;		  
		});
	}

	function pushState() {
	    selectRandomPeers()
		.forEach(peer => {
		    dispatcher.emit(peer + '.push', { sender: id, state: state });
		    peers[peer] = false;
		});
	}

	function selectRandomPeers() {
	    var livePeers = Object.keys(peers).filter(peer => peers[peer]);
	    var sample = [];
	    var index;

	    while (sample.length < Math.min(sampleSize, livePeers.length)) {
		index = Math.floor(Math.random() * livePeers.length);
		if (sample.indexOf(livePeers[index]) < 0) {
		    sample.push(livePeers[index]);
		}
	    }

	    return sample;
	}

	function reconcile(newState) {
	    Object.keys(newState)
		.filter(key => !state[key] || state[key].version < newState[key].version)
		.forEach(key => state[key] = newState[key]);
	}
    }

    function connectNodes(node, peer) {
	dispatcher.emit(node + '.heartbeat', peer);
    }

    function setState(node, data) {
	dispatcher.emit(node + '.set', data);
    }

}

module.exports = gossip;
