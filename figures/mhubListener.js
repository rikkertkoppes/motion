/**
 * goal: integrate other tests to one listener for the mhub stream
 * it should do
 * - filtering of the raw signal
 * - mapping to world coordinates
 * - calculating an sdr of the location
 * - calculating the overlap with the predefined masks
 * - recognizing the relevant figures
 * @type {[type]}
 */
var helpers = require('../helpers.js');
var MClient = require("mhub").MClient;
var ndarray = require('ndarray');
var cwise = require('cwise');
var lib = require('./lib.js');
var color = require('color');
var client;

//sequence
var seq = require('./def/F3B2012.json');

var higherTrigger = 10000;
var lowerTrigger = 400;

var filterLowpass = lowpass(0.1);
var filterHeading = heading();

var overlap = cwise({
    args: [{blockIndices: -1}, {blockIndices: -1}, 'scalar'],
    pre: function() {
        this.overlap = 0;
    },
    body: function(mask, sample, getHue) {
        var mc = getHue(mask[0],mask[1],mask[2]);
        // var sc = getHue(sample[0],sample[1],sample[2]);
        var sc = sample[1];
        //do we have a non black pixel?
        var maskPixel = ((mask[0]+mask[1]+mask[2]) > 0);
        // var samplePixel = ((sample[0]+sample[1]+sample[2]) > 0);
        var samplePixel = sample[0] > 0;
        //work correctly across 360 boundary
        var diff = Math.min(360 - Math.abs(mc-sc), Math.abs(mc-sc))
        this.overlap += (maskPixel && samplePixel && (diff < 20)) ? 1 : 0;
        // this.overlap += (maskPixel && samplePixel) ? 1 : 0;
    },
    post: function() {
        return this.overlap;
    }
});

var currentMask, recognizers;

function handleMessage(masks) {
    // console.log(recognizers);
    return function(msg) {
        if (msg.topic === 'reset') {
            console.log('reset');
            reset(masks);
        } else if (msg.topic === 'location') {
            var points = msg.data.points;
            var matrix = msg.data.matrix;
            // camera coordinates with a lowpass filter
            var cfiltered = filterLowpass(points);
            // map to world coordinates
            var wfiltered = helpers.homography(matrix)(cfiltered);
            // have x,y in dm [0-400] -> to x,y in the mask [0-100]
            var wfilteredScaled = wfiltered.map(c => Math.round(c/4));
            // calculate heading
            var wheading = filterHeading(wfilteredScaled);
            // map to SDRs
            var wsdr = makeSDR(wheading);
            // calculate overlap with stored masks
            var overlaps = masks.map(overlapMask(wfilteredScaled, wsdr));
            // feed each overlap point through the recognizer
            overlaps.forEach(function(overlap) {
                var recognizer = recognizers[overlap.path.match(/(\w*)\.png/)[1]];
                aggregateTo(recognizer)(overlap.value, '?');
            });
            // console.log(overlaps);
            // console.log(wfilteredScaled);
        }
    }
}

function overlapMask(point, sdr) {
    return function(mask) {
        //crop the mask 5 pixels around the position
        var tl = helpers.add(point,[-5,-5]);
        var crop = mask.img.lo(tl[0],tl[1]).hi(10,10);
        //calculate the overlap
        var lap = overlap(crop, sdr, getHue);
        return {
            value: lap,
            path: mask.path
        };
    }
}

function lowpass(alpha) {
    var last;
    return function(points) {
        last = helpers.process([[last||points[0]], points], helpers.lowPass(alpha))[1];
        return last;
    }
}

function heading() {
    var last20 = [];
    return function(point) {
        last20 = last20.slice(-19).concat([point]);
        if (last20.length < 20) {
            return 0;
        } else {
            var other = last20[0];
            return 90 - Math.atan2.apply(null,helpers.diff(point,other)) * 180 / Math.PI;
        }
    }
}

function getHue(r,g,b) {
    return color().rgb(r||0,g||0,b||0).hue();
}

var dot = [0,0,0,1,1,1,1,0,0,0,
           0,1,1,1,1,1,1,1,1,0,
           0,1,1,1,1,1,1,1,1,0,
           1,1,1,1,1,1,1,1,1,1,
           1,1,1,1,1,1,1,1,1,1,
           1,1,1,1,1,1,1,1,1,1,
           1,1,1,1,1,1,1,1,1,1,
           0,1,1,1,1,1,1,1,1,0,
           0,1,1,1,1,1,1,1,1,0,
           0,0,0,1,1,1,1,0,0,0];

function makeSDR(heading) {
    hdot = dot.reduce((arr, p) => arr.concat(p, p*heading),[]);
    return ndarray(hdot,[10,10,2],[2,20,1]);
}

lib.getMasks().then(function(masks) {
    console.log('masks loaded, ready for stream');
    client = new MClient("ws://localhost:13900");
    client.on("message", handleMessage(masks));
    // client.on("message", function(message) {
    //     console.log(message.topic, message.data, message.headers);
    // });
    client.on("open", function() {
        client.subscribe("default"); // or e.g. client.subscribe("blib", "my:*");
        // client.publish("default", "figure", {foo: 42});
        client.publish("default", "figure", "42");
    });
});




//recognizer stuff:
//TODO: extract

function reset(masks) {
    recognizers = masks.reduce((index, mask) => {
        var name = mask.path.match(/(\w*)\.png/)[1];
        index[name] = {
            name: name,
            mask: mask.path,
            aggregate: 0,
            trigger: higherTrigger
        }
        return index;
    }, {});
    currentMask = [0,0];
    expectMask(seq, recognizers, currentMask);
}

// helpers
// expect a mask, lower the threshold
function expectMask(sequence, recognizers, location) {
    var name = maskName(sequence, location);
    Object.keys(recognizers).forEach(key => {
        recognizers[key].trigger = (key === name)? lowerTrigger: higherTrigger;
    });
    return location;
}

function inhibitOthers(sequence, recognizers, location) {
    var name = maskName(sequence, location);
    Object.keys(recognizers).forEach(key => {
        if (key !== this.name) {
            recognizers[key].aggregate = 0;
        }
    });
    return location;
}

function getAction(sequence, location) {
    return sequence[location[0]]
}

function maskName(sequence, location) {
    return getAction(sequence, location).mask[location[1]];
}

//gets the next figure location, given the current
function getNext(sequence, current) {
    var mask = sequence[current[0]].mask;
    if (current[1] < mask.length -1) {
        return [current[0],current[1]+1];
    } else if (current[0] < sequence.length-1) {
        return [current[0] + 1, 0];
    } else {
        //no next
        return current;
    }
}

//expect the next mask
function expectNext(sequence, recognizers, current) {
    return expectMask(sequence, recognizers, getNext(sequence, current));
}

//adder
function aggregateTo(recognizer) {
    return function(value, timestep) {
        recognizer.aggregate += value;
        if (value > 0 && recognizer.aggregate > recognizer.trigger) {
            // if (recognizer.name == maskName(seq, currentMask)) {
                var cmd = [].concat(getAction(seq, currentMask).cmd||[]).join('\n');
                // console.log('found expected',recognizer.name, recognizer.aggregate, timestep, currentMask);
                console.log(cmd);
                client.publish("default", "figure", cmd);
                //recognition, inhibit other recognizers
                inhibitOthers(seq, recognizers, currentMask);
                //expect the next
                currentMask = expectNext(seq, recognizers, currentMask);
                // console.log('->', maskName(seq, currentMask));
            // } else {
            //     console.log('found unexpected', recognizer.name, maskName(seq, currentMask));
            //     //are we behind or ahead?
            // }
        }
    }
}