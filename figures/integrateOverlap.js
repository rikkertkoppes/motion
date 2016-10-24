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
var color = require('color');

var w = 100;
var s = 4;

var canvas = new paper.Canvas(10,10);

paper.setup(canvas);
paper.view.center = new paper.Point(0, 0);
paper.view.zoom = 100/40;
var defaultStyle = {
    strokeColor: 'white',
    strokeWidth: s,
    strokeCap: 'round'
}

var overlap = cwise({
    args: [{blockIndices: -1}, {blockIndices: -1}, 'scalar'],
    pre: function() {
        this.overlap = 0;
    },
    body: function(mask, sample, getHue) {
        var mc = getHue(mask[0],mask[1],mask[2]);
        var sc = getHue(sample[0],sample[1],sample[2]);
        //do we have a non black pixel?
        var maskPixel = ((mask[0]+mask[1]+mask[2]) > 0);
        var samplePixel = ((sample[0]+sample[1]+sample[2]) > 0);
        //work correctly across 360 boundary
        var diff = Math.min(360 - Math.abs(mc-sc), Math.abs(mc-sc))
        this.overlap += (maskPixel && samplePixel && (diff < 20)) ? 1 : 0;
        // this.overlap += (maskPixel && samplePixel) ? 1 : 0;
    },
    post: function() {
        return this.overlap;
    }
});

var nonBlack = cwise({
    args: [{blockIndices: -1}],
    pre: function() {
        this.nonBlack = 0;
    },
    body: function(img) {
        //do we have a non black pixel?
        var maskPixel = ((img[0]+img[1]+img[2]) > 0);
        this.nonBlack += maskPixel ? 1 : 0;

    },
    post: function() {
        return this.nonBlack;
    }
});

var points = data.points;//.slice(400,750);
var cfiltered = helpers.process(points, helpers.lowPass(0.1));
var wfiltered = cfiltered.map(helpers.homography(data.M)).map(p => {
    //have x,y in dm [0-400] -> to x,y in the mask [0-100]
    return [
        Math.round(p[0]/4),
        Math.round(p[1]/4)
    ]
});
var wfilteredSDR = wfiltered.map(function(point, i) {
    var heading;
    var lookback = 5;
    //TODO: filter heading somewhat
    if (i < lookback) {
        heading = 0;
    } else {
        var other = wfiltered[i-lookback];
        heading = 90 - Math.atan2.apply(null,helpers.diff(point,other)) * 180 / Math.PI;
    }
    // var arr = ndarray(makeSDR(point, heading),[w,w/2,4],[4,400,1]);
    var arr = ndarray(makeSDR(point, heading),[10,10,4],[4,40,1]);
    // savePixels(arr,'png').pipe(fs.createWriteStream('./foo.png'));
    return {
        point: point,
        sdr: arr
    }
});

lib.getMasks().then(function(masks) {
    // masks = masks.slice(28,29);
    var ranges = masks.map(function(mask) {
        var maskSize = nonBlack(mask.img);
        return {
            mask: mask.path,
            data: wfilteredSDR.map(function(sdr,i) {
                var tl = helpers.add(sdr.point,[-5,-5]);
                // TODO: optimization: crop image before calculating overlap
                // TODO: optimization calculate mask size beforehand
                // TODO: debug: check for workings
                var crop = mask.img.lo(tl[0],tl[1]).hi(10,10);
                // savePixels(crop,'png').pipe(fs.createWriteStream('./debug/'+i+'mask.png'));
                // savePixels(sdr.sdr,'png').pipe(fs.createWriteStream('./debug/'+i+'sdr.png'));
                // console.log(crop.shape,sdr.sdr.shape);
                var lap = overlap(crop, sdr.sdr, getHue) / maskSize;
                // console.log(lap);
                return lap;
            })//.reduce(helpers.lowPass(0.05), [])
        }
    });
    var data = JSON.stringify(ranges, null, 2);
    fs.writeFileSync('./integrated.json',data);
}).catch(function(err) {
    console.log(err);
});

function log(arr) {
    for (var i=0; i<w/2; i++) {
        console.log(arr.slice(i*w,(i+1)*w).join(''));
    }
}

function getHue(r,g,b) {
    return color().rgb(r||0,g||0,b||0).hue();
}

//creates an sdr from a point
function makeSDR(point, heading) {
    // console.log(heading);
    paper.project.activeLayer.removeChildren();
    paper.Path.Rectangle(new paper.Point([-2, -2]), new paper.Point([2, 2])).set({ fillColor: 'black' });
    new paper.Path([[0,0],[0,0.000001]]).set(defaultStyle).set({
        strokeColor: {hue: heading, saturation: 1, brightness: 1}
    });
    paper.view.update();
    // renderImage('./testpoint.png',canvas);
    return makeArray(canvas);
}

function makeArray(canvas) {
    //make binary
    var ctx = canvas.getContext('2d');
    var imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    var data = imageData.data;
    return data;
    // return data.reduce(function(arr, value, i) {
    //     if ((i % 4) === 0) {
    //         arr.push(value>128?255:0);
    //     }
    //     return arr;
    // }, []);
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