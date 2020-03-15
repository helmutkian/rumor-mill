# rumor-mill
Visualization of a Gossip Protocol.

A node transmits a heartbeat signal (a rumor) to one other node, and the receiving node reflects the same color as the transmitter node. Events generate new rumors.

## Installation

To install and run

````
npm install -g browserify
npm install
browserify network.js -o public/bundle.js
node server.js
````
Go to http://localhost:3000 to view the Gossip Protocol visualization!
