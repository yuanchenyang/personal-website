var config = {};

function round(n, precision) {
    var p = Math.pow(10, precision);
    return Math.round(n * p) / p;
}

function createPolySandbox() {
    var points = [];
    var addPoint = function(x) {
        points.push(brd.create('point',
                               [x,(Math.random()-0.5)*20]));
        brd.update();
    };

    var brd = JXG.JSXGraph.initBoard(
        'poly-sandbox',
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
}

function createSecretSharing(){
    var minX= -5, minY = -5, width = 10, height = 10;

    var brd = clearAll('secret-sharing');

    function rand55() {
        return round((Math.random() - 0.5) * 5, 1);
    };

    function makePoint (x, y) {
        return brd.create('point', [x, y], {visible: false});
    };

    var secret = rand55();

    var others = [-4, 2, 4];
    var given  = [-3, -1, 1, 3];

    var points = others.map(function (x) { return makePoint(x, rand55()); });
    points.push(makePoint(0, secret));
    var interpol = JXG.Math.Numerics.lagrangePolynomial(points);

    // brd.create('functiongraph', [interpol, -5, 5], {strokeColor:'#00ff00'});

    config.sspoints = given.map(function (x, i) {
        var y = round(interpol(x), 5);
        $("#ss-point" + i).text("("+ x + ", " + y +")");
        return [x, y];
    });

    config.secret = secret;
};

function clearAll(id) {
    config.ssboard && JXG.JSXGraph.freeBoard(config.ssboard);
    var brd =  JXG.JSXGraph.initBoard(
        id,
        {axis:true, originX: 300, originY: 200, unitX: 60, unitY: 40}
    );
    config.ssboard = brd;
    return brd;
}

function plotSecretSharing(){
    var brd = clearAll('secret-sharing');
    var deltas = [];
    try {
        for (var i = 0; i < 4; i++) {
            var txtraw = $("#ss-input" + i).val();
            var f = brd.jc.snippet(txtraw, true, 'x', true);
            brd.create('functiongraph', [f, -5, 5],
                       {dash:3, strokeColor:'#ff0000'});
            deltas.push(f);
        }
        function sum(x) {
            return deltas[0](x) + deltas[1](x) + deltas[2](x) + deltas[3](x);
        };
        var curve = brd.create('functiongraph', [sum, -5, 5], {strokeWidth:3});
        config.sspoints.forEach(function (e) {
            brd.create('point', e, {name: "("+ e[0] + ", " + e[1] +")"});
        });
        var g = brd.create('glider', [0, 0, curve], {withLabel:false});
        var t = brd.create('text', [
            function(){ return g.X()+0.1; },
            function(){ return g.Y()+0.1; },
            function(){ return "f(x) at x=" + g.X().toFixed(2) + " is equal to " + sum(g.X()).toFixed(2); }
        ],
                             {fontSize:15});
    } catch (e) {
        clearAll('secret-sharing');
        console.log(e);
    }


}

function checkSecret() {
    var secret = parseFloat($("#ss-secret").val());
    if (round(secret, 1) == config.secret) {
        $("#ss-result").text("You've got the secret!");
    } else {
        $("#ss-result").text("Nope, please try again.");
    }
}

function createSecretInfo() {
    var points = [];
    var brd = JXG.JSXGraph.initBoard(
        'secret-information',
        {axis:true, originX: 300, originY: 200, unitX: 60, unitY: 40}
    );
    brd.suspendUpdate();
    points.push(brd.create('point', [-4,  2], {face: "cross", frozen: true}));
    points.push(brd.create('point', [-2, -4], {face: "cross", frozen: true}));
    points.push(brd.create('point', [2 ,  3], {face: "cross", frozen: true}));
    points.push(brd.create('point', [4 ,  -2], {snapSizeX : 4,
                                                snapSizeY : 0.1,
                                                snapToGrid: true}));

    var pol = JXG.Math.Numerics.lagrangePolynomial(points);
    brd.create('functiongraph', [pol, -10, 10], {strokeWidth:3});
    brd.unsuspendUpdate();
}

createPolySandbox();
createSecretSharing();
createSecretInfo();
