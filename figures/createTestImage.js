/**
 * creates a test image from a part of the data using paperjs
 */

var paper = require('paper');
var fs = require('fs');
var path = require('path');
var data = require('../data/F3LVDV-cam.json');
var helpers = require('../helpers.js');

var w = 100;
var s = 4;

var canvas = new paper.Canvas(w, w/2);

paper.setup(canvas);
paper.view.center = new paper.Point(0, 0);
paper.view.zoom = w/40;
var defaultStyle = {
    strokeColor: 'white',
    strokeWidth: s,
    strokeCap: 'round'
}

var points = data.points.slice(400,750);
var cfiltered = helpers.process(points, helpers.lowPass(0.1));
var wfiltered = cfiltered.map(helpers.homography(data.M)).map(p => {
	return [(p[0]/10)-20,(p[1]/10)-10]
});


clear();
new paper.Path(wfiltered).set(defaultStyle);
paper.view.update();

renderImage('./test.png', canvas).then(function() {
	console.log('done');
}, function(err) {
	console.log(err);
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
