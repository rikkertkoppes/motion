var getPixels = promisify(require('get-pixels'));
var glob = promisify(require('glob'));

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

//getPixels, but one channel
function getBinary(path) {
    return getPixels(path).then(function(pixels) {
        return {
            path: path,
            img: pixels.pick(null,null,0)
        }
    });
}

function getMasks() {
    return glob('./masks/*.png').then(function(paths) {
        console.log(paths);
        return Promise.all(paths.map(getBinary));
    });
}

if (typeof exports === 'object') {
    module.exports = {
        promisify: promisify,
        getBinary: getBinary,
        getMasks: getMasks
    }
}