/**
 * generates masks for figures
 */
var paper = require('paper');
var fs = require('fs');
var path = require('path');

var w = 100;
var s = 4;


//TODO: use http://paperjs.org/tutorials/interaction/working-with-mouse-vectors/
//to embed direction in the image
var paths = {
    'volteEBr': [[[0,-9.5],[9.5,-9.5],[9.5,9.5],[-9.5,9.5],[-9.5,-9.5],[0,-9.5]],9.5],
    'volteEBl': [[[0,-9.5],[-9.5,-9.5],[-9.5,9.5],[9.5,9.5],[9.5,-9.5],[0,-9.5]],9.5],
    'volteAr': [[[-19.5,0],[-19.5,-9.5],[0,-9.5],[0,9.5],[-19.5,9.5],[-19.5,0]],9.5],
    'volteAl': [[[-19.5,0],[-19.5,9.5],[0,9.5],[0,-9.5],[-19.5,-9.5],[-19.5,0]],9.5],
    'volteCr': [[[19.5,0],[19.5,9.5],[0,9.5],[0,-9.5],[19.5,-9.5],[19.5,0]],9.5],
    'volteCl': [[[19.5,0],[19.5,-9.5],[0,-9.5],[0,9.5],[19.5,9.5],[19.5,0]],9.5],
    'gebrokenlijnMF5': [[[-19.5,-9.5],[-13.5,-9.5],[0,-4.25],[13.5,-9.5],[19.5,-9.5]],3],
    'gebrokenlijnFM5': [[[19.5,-9.5],[13.5,-9.5],[0,-4.25],[-13.5,-9.5],[-19.5,-9.5]],3],
    'gebrokenlijnHK5': [[[-19.5,9.5],[-13.5,9.5],[0,4.25],[13.5,9.5],[19.5,9.5]],3],
    'gebrokenlijnKH5': [[[19.5,9.5],[13.5,9.5],[0,4.25],[-13.5,9.5],[-19.5,9.5]],3],
    'gebrokenlijnMXF': [[[-19.5,-9.5],[-13.5,-9.5],[0,0],[13.5,-9.5],[19.5,-9.5]],3],
    'gebrokenlijnFXM': [[[19.5,-9.5],[13.5,-9.5],[0,0],[-13.5,-9.5],[-19.5,-9.5]],3],
    'gebrokenlijnHXK': [[[-19.5,9.5],[-13.5,9.5],[0,0],[13.5,9.5],[19.5,9.5]],3],
    'gebrokenlijnKXH': [[[19.5,9.5],[13.5,9.5],[0,0],[-13.5,9.5],[-19.5,9.5]],3],
    'vanhandveranderenMK': [[[-19.5,-9.5],[-13.5,-9.5],[13.5,9.5],[19.5,9.5]],3],
    'vanhandveranderenKM': [[[19.5,9.5],[13.5,9.5],[-13.5,-9.5],[-19.5,-9.5]],3],
    'vanhandveranderenFH': [[[19.5,-9.5],[13.5,-9.5],[-13.5,9.5],[-19.5,9.5]],3],
    'vanhandveranderenHF': [[[-19.5,9.5],[-13.5,9.5],[13.5,-9.5],[19.5,-9.5]],3],
    'vanhandveranderenFE': [[[19.5,-9.5],[13.5,-9.5],[0,9.5]],3],
    'vanhandveranderenEF': [[[0,9.5],[13.5,-9.5],[19.5,-9.5]],3],
    'vanhandveranderenME': [[[-19.5,-9.5],[-13.5,-9.5],[0,9.5]],3],
    'vanhandveranderenEM': [[[0,9.5],[-13.5,-9.5],[-19.5,-9.5]],3],
    'vanhandveranderenKB': [[[19.5,9.5],[13.5,9.5],[0,-9.5]],3],
    'vanhandveranderenBK': [[[0,-9.5],[13.5,9.5],[19.5,9.5]],3],
    'vanhandveranderenHB': [[[-19.5,9.5],[-13.5,9.5],[0,-9.5]],3],
    'vanhandveranderenBH': [[[0,-9.5],[-13.5,9.5],[-19.5,9.5]],3],
    'afwendenBE': [[[0, -9.5], [0, 9.5]], 3],
    'afwendenEB': [[[0, 9.5], [0, -9.5]], 3],
    'afwendenAC': [[[19.5, 0], [-19.5, 0]], 3],
    'afwendenCA': [[[-19.5, 0], [19.5, 0]], 3],
    'wendenAB': [[[19.5, 0], [0, -9.5]], 3],
    'wendenAE': [[[19.5, 0], [0, 9.5]], 3],
    'wendenBC': [[[0, -9.5], [-19.5, 0]], 3], 
    'wendenEC': [[[0, 9.5], [-19.5, 0]], 3], 
    'wendenCB': [[[-19.5, 0], [0, -9.5]], 3],
    'wendenCE': [[[-19.5, 0], [0, 9.5]], 3],
    'wendenBA': [[[0, -9.5], [19.5, 0]], 3], 
    'wendenEA': [[[0, 9.5], [19.5, 0]], 3],
    'hoefslagBr': [[[-19.5, -9.5], [19.5, -9.5]], 3],
    'hoefslagBl': [[[19.5, -9.5], [-19.5, -9.5]], 3],
    'hoefslagEr': [[[19.5, 9.5], [-19.5, 9.5]], 3],
    'hoefslagEl': [[[-19.5, 9.5], [19.5, 9.5]], 3],
    'hoefslagCr': [[[-19.5, 9.5], [-19.5, -9.5]], 3],
    'hoefslagCl': [[[-19.5, -9.5], [-19.5, 9.5]], 3],
    'hoefslagAr': [[[19.5, -9.5], [19.5, 9.5]], 3],
    'hoefslagAl': [[[19.5, 9.5], [19.5, -9.5]], 3]
}




var canvas = new paper.Canvas(w, w/2);

paper.setup(canvas);
paper.view.center = new paper.Point(0, 0);
paper.view.zoom = w/40;
var defaultStyle = {
    strokeColor: 'white',
    strokeWidth: s,
    strokeCap: 'round'
}


Object.keys(paths).reduce(function(pending, name) {
    return pending.then(function() {
        clear();
        var line = createPath.apply(null,paths[name]).set(defaultStyle);
        var stroke = createStroke(line, 4);
        paper.view.update();
        return renderImage(path.resolve('masks',name+'.png'), canvas);
    })
}, Promise.resolve()).then(function() {
    console.log('done')
}).catch(function(err) {
    console.log(err)
});


function clear() {
    paper.project.activeLayer.removeChildren();
    paper.Path.Rectangle(new paper.Point([-20, -10]), new paper.Point([20, 10])).set({ fillColor: 'black' });
}

//render to image
function renderImage(path,canvas) {
    return new Promise(function(resolve,reject) {
        var out = fs.createWriteStream(path)
        // makeBinary(canvas);

        var stream = canvas.pngStream();

        stream.on('data', function(chunk){
            out.write(chunk);
        });

        stream.on('end', function(){
            resolve();
        });
    }).then(function() {
        console.log('saved', path);
    });
}

function makeBinary(canvas) {
    //make binary
    var ctx = canvas.getContext('2d');
    var imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    var data = imageData.data;
    for (var i = 0; i < data.length; i ++) {
        data[i] = (data[i]>128)?255:0;
    }
    ctx.putImageData(imageData, 0, 0);
}


function createStroke(path, strokeWidth) {
    //not at 0 and length, because the tangent is not calculated correctly at that point
    createRectAt(path, 0.0001, strokeWidth);
    for (var i=1; i< path.length; i++) {
        createRectAt(path, i, strokeWidth);
    }
    createRectAt(path, path.length-0.0001, strokeWidth);
    path.remove();
    return path.set({
        strokeWidth: strokeWidth
    });
}

function createRectAt(path, offset, strokeWidth) {
    var hw = strokeWidth;// / 2;
    var heading = path.getTangentAt(offset).angle;
    var color = {hue: heading, saturation: 1, brightness: 1};
    paper.Path.Rectangle([-1.5,-hw],[1.5,hw]).set({
        position: path.getPointAt(offset),
        rotation: heading,
        fillColor: color
    });
}

function createPath(positions, radius) {
    // var positions = points.map(p => p.point);
    var path = new paper.Path(positions);
    // return path;
    var segments = path.segments.slice(0);
    path.segments = [];
    segments.forEach((s,i) => {
        var curPoint = s.point;
        if (i > 0 && i < segments.length - 1) {
            var nextPoint = segments[i + 1].point;
            var prevPoint = segments[i - 1].point;

            var c = getCurve(prevPoint, curPoint, nextPoint, radius);
            path.add(c.prev);
            path.arcTo(c.through, c.next);
        } else {
            //start and end points, just add them
            path.add(curPoint);
        }
    });

    return path;
}

function getCurve(prevPoint, curPoint, nextPoint, radius) {
    var nextNorm = curPoint.subtract(nextPoint).normalize();
    var prevNorm = curPoint.subtract(prevPoint).normalize();

    var angle = Math.acos(nextNorm.dot(prevNorm));

    var delta = radius / Math.tan(angle / 2);
    //distances from corner point to start and end point of the curve
    var prevDelta = prevNorm.normalize(delta);
    var nextDelta = nextNorm.normalize(delta);

    var through = prevNorm.add(nextNorm).normalize(Math.sqrt(delta * delta + radius * radius) - radius);

    return {
        prev: curPoint.subtract(prevDelta),
        through: curPoint.subtract(through),
        next: curPoint.subtract(nextDelta)
    };
}