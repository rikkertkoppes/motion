function process(points, filter) {
    return points.reduce(function(points, set, i) {
        //TODO: refactor a bit here
        var best, last = points[points.length-1];
        if (last) {
            var filteredSet = set.map(function(candidate) {
                return [
                    filter([last[0]], candidate[0]).pop(),
                    filter([last[1]], candidate[1]).pop()
                ];
            });
            best = filteredSet.sort(byDistanceTo(last))[0];
        } else {
            best = set[0];
        }
        return points.concat([best]);
    }, []);
}

//filters (reducers)
function indentity() {
    return function(data, datum) {
        return data.concat(datum);
    };
}

//lowpass reducer for a single series
function lowPass(α) {
    return function(data, scalar) {
        var prev = data[data.length-1];
        if (prev) {
            return data.concat(α * scalar + (1-α) * prev);
        } else {
            return data.concat(scalar);
        }
    }
}

//helpers
function homography(m) {
    return function(p) {
        p = p.concat(1);
        var r = [
            dot(m[0],p),
            dot(m[1],p),
            dot(m[2],p)
        ];
        return [r[0]/r[2], r[1]/r[2]];
    }
}

function diff(p1,p2) {
    return [p1[0]-p2[0],p1[1]-p2[1]];
}

function dot(p1,p2) {
    return p1.reduce(function(sum, cc,i) {
        return sum + (p1[i] * p2[i]);
    },0);
}

function distance2(p1,p2) {
    var d = diff(p1,p2);
    return d[0]*d[0] + d[1]*d[1];
}

//sorter by distance to another point
function byDistanceTo(target) {
    return function (p1, p2) {
        var d1 = distance2(target, p1);
        var d2 = distance2(target, p2);
        if (d1 === d2) {
            return 0;
        } else {
            return (d1 < d2)?-1:1;
        }
    }
}

if (this.module && module.exports) {
    module.exports = {
        process: process,
        indentity: indentity,
        lowPass: lowPass,
        homography: homography,
        diff: diff,
        dot: dot,
        distance2: distance2,
        byDistanceTo: byDistanceTo
    }
}