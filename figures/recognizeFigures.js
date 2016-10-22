var glob = promisify(require('glob'));
var getPixels = promisify(require('get-pixels'));
var cwise = require("cwise");

getMasks().then(function(masks) {
    getBinary('./testVolte.png').then(function(sample) {
        console.log(masks.length);
        var scores = classify(sample, masks);
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
        return overlap(mask, sample);
    });
}

//getPixels, but one channel
function getBinary(path) {
    return getPixels(path).then(function(pixels) {
        return pixels.pick(null,null,0);
    });
}

function getMasks() {
    return glob('./masks/*.png').then(function(paths) {
        console.log(paths);
        return Promise.all(paths.map(getBinary));
    });
}

function promisify(fn) {
    return function() {
        var args = [].slice.apply(arguments);
        return new Promise(function(resolve, reject) {
            args.push(function(err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
            fn.apply(this, args);
        });
    }
}