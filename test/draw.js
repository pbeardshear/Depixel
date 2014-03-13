// Different drawing functions for different objects
var draw = {};


// Constants
draw.initialize = function (config) {
	// Private
	this.__canvas = config.canvas;


	// Public
	this.context = this.__canvas.getContext('2d');
	this.pixelSize = config.pixelSize;
};


draw.nodegraph = function (nodes, edges) {
	// Draw all the nodes
	nodes.forEach(function (node) {
		draw.node(node.position, node.color);
	});

	// Draw all the edges
	edges.forEach(function (edge) {
		var nodes = edge.nodes;
		draw.edge(nodes[0], nodes[1]);
	});
};


draw.node = function (pos, color) {
	var center = getCenter(pos.row, pos.col, this.pixelSize);

	this.context.fillStyle = color.toString();
	this.context.fillRect(center.x - 5, center.y - 5, this.pixelSize, this.pixelSize);

	this.context.moveTo(center.x, center.y);
	this.context.strokeStyle = '#000000';
	this.context.fillStyle = '#FFFFFF';
	this.context.beginPath();
	this.context.arc(center.x, center.y, this.pixelSize / 5, 0, Math.PI * 2);
	this.context.fill();
	this.context.stroke();
};


draw.edge = function (from, to) {
	var fromCenter = getCenter(from.position.row, from.position.col, this.pixelSize),
		toCenter = getCenter(to.position.row, to.position.col, this.pixelSize);

	this.context.strokeStyle = '#AAAAAA';
	this.context.strokeWidth = 1;
	this.context.beginPath();
	this.context.moveTo(fromCenter.x, fromCenter.y);
	this.context.lineTo(toCenter.x, toCenter.y);
	this.context.stroke();
};


// ---------------------------------------------------

function getCenter(row, col, pixelSize) {
	var tl = { x: col * pixelSize, y: row * pixelSize };

	return { x: tl.x + (pixelSize / 2), y: tl.y + (pixelSize / 2) };
}


