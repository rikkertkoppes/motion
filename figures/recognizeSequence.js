/**
 * Idea: use previously generated overlap data
 * loop through the data to simulate incoming overlaps
 *
 * import expected figure sequence
 * lower expectation on first figure
 * 
 * for each mask, integrate the data
 * 
 */

//overlap data
var data = require('./integrated.json');
//sequence
var seq = require('./def/F3B2012.json');

//rationale of trigger levels
//a full overlap is about 78 pixels (pi * r^2, r= 5 pixels)
//typical values are around 50
//so 500 is about 10 frames of overlap
//10000 is about 200 frames of overlap

//level at which we recognize a mask
// var higherTrigger = 10000;
var higherTrigger = 5000;
//level at which we recognize an expected mask
var lowerTrigger = 500;

//set up recognizers
var recognizers = data.reduce((index, map) => {
    index[map.mask.match(/(\w*)\.png/)[1]] = {
        mask: map.mask,
        aggregate: 0,
        trigger: higherTrigger
    }
    return index;
}, {});

var currentMask = [0,0];

expectMask(seq, recognizers, currentMask);

// console.log(recognizers);

//let the data flow, for each recognizer
//iterate over time
// data[0].data.slice(0,4000).forEach((_, timestep) => {
data[0].data.forEach((_, timestep) => {
    //iterate over masks
    data.forEach(map => {
        var recognizer = recognizers[map.mask.match(/(\w*)\.png/)[1]];
        aggregateTo(recognizer)(map.data[timestep], timestep);
    });
});


// !!!!!!!!!! THIS WORKS, except for the last gebroken lijn (hardly shows up in the overlap)
// TODO: verify with other data, list the magic numbers somewhere
// TODO: do this while data comes in

// console.log(getRecognizers(recognizers));

/**
 * TODO when an expected figure is not found, find a way to shift the expectation
 * after an alternative has been found
 * -> currently it is shifted to the next expected,
 * -> but should be to the next after the recognized one
 * this shows with the current highTrigger setting (5000) at the end
 */




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

function maskName(sequence, location) {
    return sequence[location[0]].mask[location[1]];
}

//expect the next mask
function expectNext(sequence, recognizers, current) {
    var mask = sequence[current[0]].mask;
    if (current[1] < mask.length -1) {
        return expectMask(sequence, recognizers, [current[0],current[1]+1]);
    } else if (current[0] < sequence.length-1) {
        return expectMask(sequence, recognizers, [current[0] + 1, 0]);
    } else {
        //done
        console.log('done');
        return current;
    }
}

//adder
function aggregateTo(recognizer) {
    return function(value, timestep) {
        recognizer.aggregate += value;
        if (value > 0 && recognizer.aggregate > recognizer.trigger) {
            console.log('oi',recognizer.mask, recognizer.aggregate, timestep, currentMask);
            //recognition, inhibit other recognizers
            inhibitOthers(seq, recognizers, currentMask);
            //expect the next
            currentMask = expectNext(seq, recognizers, currentMask);
            // console.log('->', maskName(seq, currentMask));
        }
    }
}

//get all recognizers
function getRecognizers(index) {
    return Object.keys(index).map(key => index[key]);
}