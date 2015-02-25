var points = [];
var addPoint = function(x) {
    points.push(brd.create('point',
                      [x,(Math.random()-0.5)*20]));
    brd.update();
};

function zeroArray(n) {

}

var brd = JXG.JSXGraph.initBoard(
    'box',
    {axis:true, originX: 400, originY: 300, unitX: 50, unitY: 25}
);
brd.suspendUpdate();
addPoint(-5);
addPoint(-2);
addPoint(3);
addPoint(6);
var pol = JXG.Math.Numerics.lagrangePolynomial(points);
brd.create('functiongraph', [pol, -10, 10], {strokeWidth:3});

var xprojections = points.map(function (e){
    return brd.create('point',
                      [function () { return e.X(); }, 0],
                      {size: 0.5});
});

// Create deltas
points.forEach(function(e, i){
    var delta = [];
    for(var j=0; j < points.length; j++) {
        delta[j] = xprojections[j];
    }
    delta[i] = e;
    var deltapol = JXG.Math.Numerics.lagrangePolynomial(delta);
    brd.create('functiongraph', [deltapol, -10, 10],
               {dash:3, strokeColor:'#ff0000'});
});

brd.unsuspendUpdate();
