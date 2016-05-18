var d3 = require('d3');
var EventEmitter = require('events');
var io = require('socket.io-client');
var dispatcher = io();

var width = 1250;
var height = 700;

var i = 0;
var color = d3.scale.category10();

var nodes = [];
var links = [];

var force = d3.layout.force()
	.nodes(nodes)
	.links(links)
	.charge(-500)
	.linkDistance(300)
	.gravity(0.3)
	.size([width, height])
	.on('tick', tick);

var svg = d3.select('#content')
	.append('svg')
	.attr('width', width)
	.attr('height', height);

var node = svg.selectAll('.node');
var link = svg.selectAll('.link');

update();

function update() {
    node = node.data(force.nodes(), d => d.id);

    node.enter()
	.append('circle')
	.attr('class', d => 'node node-' + d.id)
	.attr('r', 8)
	.style('fill', d => d.state.color ? color(d.state.color.value) : 'black');

    node.exit()
	.remove();

    link = link.data(force.links(), d => d.source.id + '-' + d.target.id);

    link.enter()
	.append('line')
	.attr('class', d => 'link link-' + (d.source.id || d.source) + '-' + (d.target.id || d.target))
	.style('stroke', 'grey')
	.style('stroke-width', 1)
	.style('opacity', 0.3);

    link.exit()
	.remove();

    force.start();
};

function tick() {
    node
	.attr('cx', d => d.x)
	.attr('cy', d => d.y);

    link
	.attr('x1', d => d.source.x)
	.attr('y1', d => d.source.y)
	.attr('x2', d => d.target.x)
	.attr('y2', d => d.target.y);
}

svg.on('click', () => {
    dispatcher.emit('createNode');
});

dispatcher.on('nodeCreated', debounce(node => {
    var peers = node.peers;

    nodes.push(node);

    peers.forEach(peer => {
	links.push({
	    source: node.id,
	    target: parseInt(peer)
	});
    });

    dispatcher.on(node.id + '.push', debounce(payload => {
	node.state = payload.state; 

	d3.select('.node-' + node.id)
	    .style('fill', d => d.state.color ? color(d.state.color.value) : 'black');

	d3.select('.link-' + node.id + '-' + payload.sender)
	    .transition().duration(500)
	    .style('stroke', d => d.source.state.color ? color(d.source.state.color.value) : 'black')
	    .style('stroke-width', 5)
	    .each('end', function () {
		d3.select(this)
		    .transition().duration(50)
		    .style('stroke', 'grey')
		    .style('stroke-width', 1);
	    });
    }));

    dispatcher.on(node.id + '.set', debounce(payload => {
	node.state[payload.key] = {
	    value: payload.value
	};

	d3.select('.node-' + node.id)
	    .transition().duration(200)
	    .style('stroke', d => d.state.color ? color(d.state.color.value) : 'black')
	    .style('stroke-width', 20)
	    .style('stroke-opacity', 0.7)
	    .each('end', function () {
		d3.select(this)
		    .transition().duration(200)
		    .style('stroke-width', 0)
		    .style('stroke-opacity', 0);
	    });
    }));

    update();
}));

var lastCalled = null;
function debounce(cb) {
    var now = new Date();
    var diff = now - (lastCalled || 0);

    return function () {
	setTimeout(() => cb.apply(null, arguments), Math.max(200 - diff, 0));
	lastCalled = now;
    }; 
}
