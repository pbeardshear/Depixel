// Classes that represent a graph of nodes
function NodeGraph(nodes) {

	// 2-D array of nodes
	this.nodes = nodes;
	this.edges = {};

	this.rowCount = this.nodes.length;
	this.colCount = this.nodes[0].length;	// All rows should have the same number of columns


	this.getEdge = function (from, to) {
		return this.edges[from.id][to.id] || this.edges[to.id][from.id];
	};

	this.getEdges = function (node) {
		return this.edges[node.id];
	};

	this.addEdge = function (from, to) {
		if (!this.edges[from.id]) {
			this.edges[from.id] = {};
		}
		if (!this.edges[to.id]) {
			this.edges[to.id] = {};
		}

		// TODO: Only save one of these, or handle duplicates somehow
		var edge = new Edge(from, to);
		this.edges[from.id][to.id] = edge;
		this.edges[to.id][from.id] = edge;
	};

	this.hasEdge = function (from, to) {
		return !!(
			((from.id in this.edges) && this.edges[from.id][to.id]) ||
			((to.id in this.edges) && this.edges[to.id][from.id])
		);
	};

	this.removeEdge = function (from, to) {
		if (from instanceof Edge) {
			var nodes = from.nodes;
			from = nodes[0];
			to = nodes[1];
		}

		if (from.id in this.edges) {
			delete this.edges[from.id][to.id];
		}
		if (to.id in this.edges) {
			delete this.edges[to.id][from.id];
		}
	}

	this.createBoundingBox = function (crossEdges, width, height) {
		var nodes = crossEdges[0].nodes.concat(crossEdges[1].nodes);

		var minRow = nodes[0].position.row,
			minCol = nodes[0].position.col;

		for (var i = 1; i < nodes.length; i++) {
			if (nodes[i].position.row < minRow) {
				minRow = nodes[i].position.row;
			}
			if (nodes[i].position.col < minCol) {
				minCol = nodes[i].position.col;
			}
		}

		var origin = {
			row: Math.max(minRow - ((width - 2) / 2), 0),
			col: Math.max(minCol - ((width - 2) / 2), 0)
		};

		return new BoundingBox(origin, width, height);
	};
}

function Node(position, color) {
	this.id = generateID();

	this.position = position;	// Object of { row: [rowNum], col: [colNum] }

	this.color = color;
}

function generateID(a) {
	return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,generateID);

}

function Edge(from, to) {
	if (!from || !to) {
		throw new Error('Not enough nodes passed to edge constructor:', from, to);
	}

	this.nodes = [from, to];

	this.heuristics = {};

	this.equals = function (edge) {
		var nodes = edge.nodes;

		// Edges are equivalent if they connect the same nodes (ordering doesn't matter)
		return (nodes[0].id === this.nodes[0].id && nodes[1].id === this.nodes[1].id)
			|| (nodes[0].id === this.nodes[1].id && nodes[1].id === this.nodes[0].id);
	};

	this.computeHeuristic = function () {
		if (this.heuristics) {
			// Use underscore for this
			return _.values(this.heuristics).reduce(function (curr, next) { return curr + next; }, 0);
		}
	};
}

function BoundingBox(origin, width, height) {
	this.contains = function (node) {
		return node.position.row >= origin.row && node.position.row < (origin.row + height)
			&& node.position.col >= origin.col && node.position.col < (origin.col + width);
	};
}
