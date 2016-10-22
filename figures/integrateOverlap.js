/**
 * integrate overlap over time using real data
 */
var paper = require('paper');
var cwise = require('cwise');
var ndarray = require('ndarray');
var helpers = require('../helpers.js');
var lib = require('./lib.js');
var data = require('../data/F3LVDV-cam.json');
var fs = require('fs');
var savePixels = require('save-pixels');

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

var overlap = cwise({
    args: ["array", "array"],
    pre: function() {
        this.overlap = 0;
        this.maskSize = 0;
    },
    body: function(mask, sample) {
        this.overlap += (mask > 128 && sample > 0.5) ? 1 : 0;
        this.maskSize += (mask > 128) ? 1 : 0;

    },
    post: function() {
        return this.overlap / this.maskSize;
    }
});

var points = data.points.slice(400,750);
var cfiltered = helpers.process(points, helpers.lowPass(0.1));
var wfiltered = cfiltered.map(helpers.homography(data.M)).map(p => {
    return [(p[0]/10)-20,(p[1]/10)-10]
});//.slice(50,51);

lib.getMasks().then(function(masks) {
    // masks = masks.slice(8,9);
    var ranges = masks.map(function(mask) {
        return wfiltered.map(function(point) {
            var sdr = makeSDR(point);
            // log(sdr);
            var arr = ndarray(sdr,[w,w/2], [1,100]);
            var lap = overlap(mask, arr);
            // savePixels(arr,'png').pipe(fs.createWriteStream('./foo.png'));
            // console.log(lap);
            return lap;
        })
    });
    var data = JSON.stringify(ranges, null, 2);
    fs.writeFileSync('./integrated.json',data);
}, function(err) {
    console.log(err);
});

function log(arr) {
    for (var i=0; i<w/2; i++) {
        console.log(arr.slice(i*w,(i+1)*w).join(''));
    }
}

//creates an sdr from a point
function makeSDR(point) {
    paper.project.activeLayer.removeChildren();
    paper.Path.Rectangle(new paper.Point([-20, -10]), new paper.Point([20, 10])).set({ fillColor: 'black' });
    new paper.Path([point,helpers.add(point,[0,0.000001])]).set(defaultStyle);
    paper.view.update();
    return makeArray(canvas);
}

function makeArray(canvas) {
    //make binary
    var ctx = canvas.getContext('2d');
    var imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    var data = imageData.data;
    return data.reduce(function(arr, value, i) {
        if ((i % 4) === 0) {
            arr.push(value>128?255:0);
        }
        return arr;
    }, []);
}