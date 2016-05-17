var d3 = require('d3');
var EventEmitter = require('events');
var dispatcher = new EventEmitter();
var gossip = require('./gossip.js')(dispatcher);

var width = 1250;
var height = 700;

var i = 0;
var color = d3.scale.category10();

var nodes = [];
var links = [];

var force = d3.layout.force()
        .nodes(nodes)
	.links(links)
	.charge(-700)
	.linkDistance(250)
	.gravity(0.1)
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
	.style('fill', d => d.state.color ? d.state.color.value : 'black');

    node.exit()
	.remove();

    link = link.data(force.links(), d => d.source.id + '-' + d.target.id);

    link.enter()
	.append('line')
	.attr('class', d => 'link link-' + d.source + '-' + d.target)
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
    var node = gossip.createNode(nodes.length);
    var numPeers = Math.floor((Math.random() * (Math.ceil(nodes.length * 0.75) - 1)) + 1);
    var peers = [];
    var index;

    while (peers.length < numPeers) {
	index = Math.floor(Math.random() * numPeers);
	if (peers.indexOf(index) < 0) {
	    peers.push(index);
	}
    }

    dispatcher.on(node.id + '.push', payload => {
	d3.select('.node-' + node.id)
	    .style('fill', d => d.state.color ? d.state.color.value : 'black');

	d3.select('.link-' + node.id + '-' + payload.sender)
	    .transition().duration(200)
	    .style('stroke', d => d.source.state.color ? d.source.state.color.value : 'black')
	    .style('stroke-width', 5)
	    .each('end', function () {
		d3.select(this)
		    .transition().duration(50)
		    .style('stroke', 'grey')
		    .style('stroke-width', 1);
	    });
    });

    dispatcher.on(node.id + '.set', payload => {
	d3.select('.node-' + node.id)
	    .transition().duration(500)
	    .style('stroke', d => d.state.color ? d.state.color.value : 'black')
	    .style('stroke-width', 20)
	    .style('stroke-opacity', 0.7)
	    .each('end', function () {
		d3.select(this)
		    .transition().duration(200)
		    .style('stroke-width', 0)
		    .style('stroke-opacity', 0);
	    });
    });
    
    nodes.push(node);
    
    peers.forEach(peer => {
	gossip.connectNodes(node.id, nodes[peer].id);
	gossip.connectNodes(nodes[peer].id, node.id);
	links.push({ source: node.id, target: peer });
    });

    node.start();
    update();
});

setInterval(() => {
    var index = Math.floor(Math.random() * nodes.length);
    
    gossip.setState(nodes[index].id, { key: 'color', value: color(i) });

    if (i >= 10) {
	i = 0;
    } else {
	i++;
    }
    
}, (Math.random() * (2000 - 500)) + 500);
