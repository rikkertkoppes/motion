/**
 * very simple proof of concept that a figure can be classified by calculating
 * the overlap between a sample image and some possible figures.
*/
var lib = require('./lib.js');
var cwise = require("cwise");

lib.getMasks().then(function(masks) {
    lib.getBinary('./testVolte.png').then(function(sample) {
        console.log(masks.length);
        var scores = classify(sample.img, masks);
        console.log(scores);
    });
}, function(err) {
    console.log(err);
});

var overlap = cwise({
    args: ["array", "array"],
    pre: function() {
        this.overlap = 0;
        this.maskSize = 0;
    },
    body: function(mask, sample) {
        this.overlap += (mask > 128 && sample > 128) ? 1 : 0;
        this.maskSize += (mask > 128) ? 1 : 0;

    },
    post: function() {
        return this.overlap / this.maskSize;
    }
});

function classify(sample, masks) {
    return masks.map(function(mask) {
        return overlap(mask.img, sample);
    });
}