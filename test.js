var gossip = require('./gossip.js');
var EventEmitter = require('events');
var dispatcher = new EventEmitter();
var protocol = gossip(dispatcher);

dispatcher.on('bar.push', payload => console.log(JSON.stringify(payload)));

var foo = protocol.createNode('foo');
var bar = protocol.createNode('bar');

protocol.connectNodes('foo', 'bar');

foo.start();
bar.start();

protocol.setState('foo', { key: 'color', value: 'blue' });

