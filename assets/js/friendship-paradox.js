var i,
    s,
    N = 250,
    E = 500,
    clMore = '#f00',
    clLess = '#00f',
    clFade = '#eee',
    clNodeDefault = '#666',
    clEdgeDefault = '#ccc',
    graphContainer="graph";

sigma.classes.graph.addMethod('neighbors', function(nodeId) {
    var k,
        neighbors = {},
        index = this.allNeighborsIndex[nodeId] || {};

    for (k in index)
        neighbors[k] = this.nodesIndex[k];

    return neighbors;
});

function newGraph() {
    $("#"+graphContainer).text("");
    var g = {
        nodes: [],
        edges: []
    };


    // Generate a random graph:
    for (i = 0; i < N; i++)
        g.nodes.push({
            id: 'n' + i,
            label: 'Node ' + i,
            x: Math.random(),
            y: Math.random(),
            size: 0.5,
            color: clNodeDefault
        });

    for (i = 0; i < E; i++)
        g.edges.push({
            id: 'e' + i,
            source: 'n' + (Math.random() * N | 0),
            target: 'n' + (Math.random() * N | 0),
            size: Math.random(),
            color: clEdgeDefault
        });

    // Instantiate sigma:
    s = new sigma({
        graph: g,
        container: graphContainer
    });

    var globalRed  = 0;
    var globalBlue = 0;

    s.graph.nodes().forEach(function(n) {
        var neighbors = []
        , lower = 0
        , higher = 0
        , myDegree = s.graph.degree(n.id);

        n.label = "" + myDegree;

        for (var id in s.graph.neighbors(n.id)) {
            neighbors.push(id);
        }
        var neighborDegSum = 0;
        neighbors.map(function(n) {
            neighborDegSum += s.graph.degree(n);
        });
        var averageNeighborDeg = neighborDegSum / neighbors.length;

        if (myDegree < averageNeighborDeg) {
            globalBlue += 1;
            n.color = clLess;
        } else if (myDegree > averageNeighborDeg) {
            globalRed += 1;
            n.color = clMore;
        }
    });
    s.refresh();

    // We first need to save the original colors of our
    // nodes and edges, like this:
    s.graph.nodes().forEach(function(n) {
        n.originalColor = n.color;
    });
    s.graph.edges().forEach(function(e) {
        e.originalColor = e.color;
    });

    // When a node is clicked, we check for each node
    // if it is a neighbor of the clicked one. If not,
    // we set its color as grey, and else, it takes its
    // original color.
    // We do the same for the edges, and we only keep
    // edges that have both extremities colored.
    s.bind('clickNode', function(e) {
        var nodeId = e.data.node.id,
            nodeDegree = s.graph.degree(nodeId),
            toKeep = s.graph.neighbors(nodeId);
        toKeep[nodeId] = e.data.node;

        s.graph.nodes().forEach(function(n) {
            if (toKeep[n.id]) {
                var deg = s.graph.degree(n.id);
                if (deg < nodeDegree) {
                    n.color = clLess;
                } else if (deg > nodeDegree) {
                    n.color = clMore;
                } else {
                    n.color = clNodeDefault;
                }
            } else {
                n.color = clFade;
            }
        });

        s.graph.edges().forEach(function(e) {
            if (e.source == nodeId || e.target == nodeId) {
                e.color = e.originalColor;
            } else {
                e.color = clFade;
            }
        });

        // Since the data has been modified, we need to
        // call the refresh method to make the colors
        // update effective.
        s.refresh();
    });

    // When the stage is clicked, we just color each
    // node and edge with its original color.
    s.bind('clickStage', function(e) {
        s.graph.nodes().forEach(function(n) {
            n.color = n.originalColor;
        });

        s.graph.edges().forEach(function(e) {
            e.color = e.originalColor;
        });

        // Same as in the previous event:
        s.refresh();
    });

    $("#graph-red").text("Red:" + globalRed / N * 100 + "%");
    $("#graph-blue").text("Blue:" + globalBlue / N * 100 + "%");
}

$("#graph-refresh").click(newGraph);

newGraph();
