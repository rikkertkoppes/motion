/**
 * generates templates for figures
 */
var paper = require('paper');
var fs = require('fs');
var path = require('path');

var w = 100;
var s = 4;

var paths = {
    'volteEB': [[[0,-9.5],[9.5,-9.5],[9.5,9.5],[-9.5,9.5],[-9.5,-9.5],[0,-9.5]],9.5],
    'volteA': [[[-19.5,0],[-19.5,-9.5],[0,-9.5],[0,9.5],[-19.5,9.5],[-19.5,0]],9.5],
    'volteC': [[[19.5,0],[19.5,-9.5],[0,-9.5],[0,9.5],[19.5,9.5],[19.5,0]],9.5],
    'gebrokenlijnB5': [[[-19.5,-9.5],[-17,-9.5],[0,-4.25],[17,-9.5],[19.5,-9.5]],3],
    'gebrokenlijnE5': [[[-19.5,9.5],[-17,9.5],[0,4.25],[17,9.5],[19.5,9.5]],3],
    'gebrokenlijnB': [[[-19.5,-9.5],[-17,-9.5],[0,0],[17,-9.5],[19.5,-9.5]],3],
    'gebrokenlijnE': [[[-19.5,9.5],[-17,9.5],[0,0],[17,9.5],[19.5,9.5]],3]
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
        makeBinary(canvas);

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