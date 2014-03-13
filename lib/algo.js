/**
 * Utilities
 */


// Convert from <canvas> context to a nodegraph
function toNodeGraph(canvas, pSize) {
	// Since this is a pixel image, solid color groups are single "nodes"
	var context = canvas.getContext('2d'),
		width = canvas.width,
		height = canvas.height,
		imageData = context.getImageData(0, 0, canvas.width, canvas.height);


	// Assumption, all pixels are squares of the same size, so we only need to find the height/width
	// of the first pixel, then extrapolate

	var nodes = [];

	for (var row = 0; row < imageData.data.length; row += pSize * width * 4) {
		var nodeRow = [];

		for (var col = 0; col < width * 4; col += pSize * 4) {
			var adjRow = row / (pSize * width * 4);
			var adjCol = col / (pSize * 4);
			var cIndex = (row + (pSize * width * 2)) + (col + (pSize * 2));		// Use the center of the pixel to avoid artifacts along the edges
			var color = new RGBA(imageData.data[cIndex], imageData.data[cIndex+1], imageData.data[cIndex+2], imageData.data[cIndex+3]);

			nodeRow.push(new Node({ row: adjRow, col: adjCol }, color));
		}

		nodes.push(nodeRow);
	}

	return new NodeGraph(nodes);
}


// Establish edges between all nodes (vertical, horizontal, diagonal)
function connectNodeGraph(nodegraph) {

}


// Creates a new node graph with only edges between "similar" nodes
// Similarity between nodes is determined using the hqx algorithm:
//	nodes are considered dissimilar if the difference in YUV values
//	is larger than 48/255, 7/255, or 6/255 respectively
function createSimilarityGraph(nodegraph) {
	// Hashset of nodes we have already checked
	var seen = {};

	// 2-D array of nodes
	var nodes = nodegraph.nodes;

	for (var row = 0; row < nodes.length; row++) {
		for (var col = 0; col < nodes[row].length; col++) {
			var node = nodes[row][col];

			// Get the neighbors in the eight cardinal directions
			var neighbors = getNeighbors(nodegraph, row, col);

			for (var k = 0; k < neighbors.length; k++) {
				if (!(neighbors[k].id in seen)) {
					var nYUV = node.color.toYUV();
					var neighborYUV = neighbors[k].color.toYUV();

					if (nYUV.isSimilar(neighborYUV)) {
						nodegraph.addEdge(node, neighbors[k]);
					}
				}
			}

			// Finished with this node
			seen[node.id] = 1;
		}
	}
}


// Removes edges from a similarity graph to make it planar (no crossing edges)
// Two cases:
//	1. 2x2 block is fully connected - remove diagonal edges
//	2. 2x2 block only contains diagonals - connection with lowest heuristic weight
function pruneSimilarityGraph(nodegraph) {
	var crossEdges = [];

	// Iterate over all 2x2 blocks
	for (var i = 0; i < nodegraph.nodes.length - 1; i++) {
		for (var j = 0; j < nodegraph.nodes[i].length - 1; j++) {
			var tl, tr, bl, br;
			tl = nodegraph.nodes[i][j];
			tr = nodegraph.nodes[i][j+1];
			bl = nodegraph.nodes[i+1][j];
			br = nodegraph.nodes[i+1][j+1];

			// Bit flag for edges
			var edgeMask = 0;

			edgeMask |= +nodegraph.hasEdge(tl, bl) << 0;
			edgeMask |= +nodegraph.hasEdge(tl, tr) << 1;
			edgeMask |= +nodegraph.hasEdge(tr, br) << 2;
			edgeMask |= +nodegraph.hasEdge(bl, br) << 3;
			edgeMask |= +nodegraph.hasEdge(tl, br) << 4;
			edgeMask |= +nodegraph.hasEdge(tr, bl) << 5;

			// Equal to 111111 in binary, which means all edges are set
			if (edgeMask == 0x3f) {
				// Remove the diagonal edges
				nodegraph.removeEdge(tl, br);
				nodegraph.removeEdge(tr, bl);
			}

			// Equal to 110000 in binary, which means only diagonals are set
			if (edgeMask == 0x30) {
				// Compute heuristics
				crossEdges.push([nodegraph.getEdge(tl, br), nodegraph.getEdge(tr, bl)]);
			}
		}
	}

	console.log(crossEdges);

	// Handle all the cross edges
	curveHeuristic(nodegraph, crossEdges);
	sparsePixelHeuristic(nodegraph, crossEdges);
	islandHeuristic(nodegraph, crossEdges);

	// Iterate cross edges and pick one to remove
	for (var i = 0; i < crossEdges.length; i++) {
		var edges = crossEdges[i];

		if (edges[0].computeHeuristic() > edges[1].computeHeuristic()) {
			nodegraph.removeEdge(edges[1]);
		}
		else {
			nodegraph.removeEdge(edges[0]);
		}
	}
}

// Computes the curve heuristic for a given list of edges
function curveHeuristic(nodegraph, edgelist) {
	for (var i = 0; i < edgelist; i++) {
		var crossEdges = edgelist[i];

		var firstCurveLength = iterateCurves(nodegraph, crossEdges[0], null, 1),
			secondCurveLength = iterateCurves(nodegraph, crossEdges[1], null, 1);

		crossEdges[0].heuristics.curves = Math.max(firstCurveLength - secondCurveLength, 0);
		crossEdges[1].heuristics.curves = Math.max(secondCurveLength - firstCurveLength, 0);
	}
}

function iterateCurves(nodegraph, edge, startingEdge, curveLength) {
	var nodes = edge.nodes;

	for (var j = 0; j < nodes.length; j++) {
		var edges = nodegraph.getEdges(nodes[j]);

		// Curve continues for nodes of valence 2
		if (edges.length == 2) {
			var leavingEdge = (edge.equals(edges[0])) ? edges[1] : edges[0];

			if (!leavingEdge.equals(startingEdge)) {
				curveLength = iterateCurves(nodegraph, leavingEdge, edge, curveLength++);
			}

		}
	}

	return curveLength;
}

// Computes the sparse pixel heuristic for a given list of edges
function sparsePixelHeuristic(nodegraph, edgelist) {
	for (var i = 0; i < edgelist.length; i++) {
		var crossEdges = edgelist[i],
			boundingBox = nodegraph.createBoundingBox(crossEdges, 8, 8);

		crossEdges[0].heuristics.sparsePixel = getConnectedComponentSize(nodegraph, crossEdges[0], boundingBox);
		crossEdges[1].heuristics.sparsePixel = getConnectedComponentSize(nodegraph, crossEdges[1], boundingBox);
	}
}


function getConnectedComponentSize(nodegraph, edge, boundingBox) {
	var seen = {};
	var nodeList = [].concat(edge.nodes);		// We want to create a new array so we don't end up modifying edge.nodes

	while (nodeList.length > 0) {
		var next = nodeList.pop();
		var edges = nodegraph.getEdges(next);

		for (var i = 0; i < edges.length; i++) {
			var nodes = edges[i].nodes;
			if (!(node.id in seen) && boundingBox.contains(node)) {
				nodeList.push(node);

				seen[node.id] = 1;
			}
		}
	}

	return Object.keys(seen).length;
}


// Computes the island heuristic for a given list of edges
function islandHeuristic(nodegraph, edgelist) {
	for (var i = 0; i < edgelist.length; i++) {
		var crossEdges = edgelist[i];

		for (var j = 0; j < crossEdges.length; j++) {
			var nodes = crossEdges[j].nodes,
				firstEdges = nodegraph.getEdges(nodes[0]),
				secondEdges = nodegraph.getEdges(nodes[1]);

			if (firstEdges.length == 1 || secondEdges.length == 1) {
				// A node connected to a cross edge has a valence of 1
				crossEdges[j].heuristics.island = 5;
			}
		}
	}
}




function getNeighbors(nodegraph, row, col) {
	var neighbors = [];
	// N
	if (row > 0) {
		neighbors.push(nodegraph.nodes[row-1][col]);
	}
	// NW
	if (row > 0 && col > 0) {
		neighbors.push(nodegraph.nodes[row-1][col-1]);
	}
	// W
	if (col > 0) {
		neighbors.push(nodegraph.nodes[row][col-1]);
	}
	// SW
	if (row < nodegraph.rowCount - 1 && col > 0) {
		neighbors.push(nodegraph.nodes[row+1][col-1]);
	}
	// S
	if (row < nodegraph.rowCount - 1) {
		neighbors.push(nodegraph.nodes[row+1][col]);
	}
	// SE
	if (row < nodegraph.rowCount - 1 && col < nodegraph.colCount - 1) {
		neighbors.push(nodegraph.nodes[row+1][col+1]);
	}
	// E
	if (col < nodegraph.colCount - 1) {
		neighbors.push(nodegraph.nodes[row][col+1]);
	}
	// NE
	if (row > 0 && col < nodegraph.colCount - 1) {
		neighbors.push(nodegraph.nodes[row-1][col+1]);
	}
	return neighbors;
}


