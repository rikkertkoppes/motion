/**
 * very simple proof of concept that a figure can be classified by calculating
 * the overlap between a sample image and some possible figures.
*/
var lib = require('./lib.js');
var cwise = require("cwise");
var color = require('color');

lib.getMasks().then(function(masks) {
    return lib.getBinary('./test.png').then(function(sample) {
        console.log(masks.length);
        var scores = classify(sample, masks);
        console.log(scores);
    });
}, function(err) {
    console.log(err);
});

var overlap = cwise({
    args: [{blockIndices: -1}, {blockIndices: -1}, 'scalar'],
    pre: function() {
        this.overlap = 0;
        this.maskSize = 0;
    },
    body: function(mask, sample, getHue) {
        var mc = getHue(mask[0],mask[1],mask[2]);
        var sc = getHue(sample[0],sample[1],sample[2]);
        //do we have a non black pixel?
        var maskPixel = ((mask[0]+mask[1]+mask[2]) > 0);
        var samplePixel = ((sample[0]+sample[1]+sample[2]) > 0);
        //work correctly across 360 boundary
        var diff = Math.min(360 - Math.abs(mc-sc), Math.abs(mc-sc))
        this.overlap += (maskPixel && samplePixel && (diff < 10)) ? 1 : 0;
        this.maskSize += maskPixel ? 1 : 0;

    },
    post: function() {
        return this.overlap / this.maskSize;
    }
});

function getHue(r,g,b) {
    return color().rgb(r,g,b).hue();
}

function classify(sample, masks) {
    return masks.map(function(mask) {
        return overlap(mask.img, sample.img, getHue);
    });
}