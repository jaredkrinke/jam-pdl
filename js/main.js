/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

// N-dimensional array
function NArray(dimensions) {
    this.dimensions = dimensions;
    this.data = [];
}

// Arguments: value, x1, x2, x3, etc.
NArray.prototype.set = function () {
    var value = arguments[0];
    var dimensions = this.dimensions;
    var d = this.data;
    for (var i = 0; i < dimensions; i++) {
        var x = arguments[i + 1];
        if (i === dimensions - 1) {
            d[x] = value;
            break;
        } else if (!d[x]) {
            d[x] = [];
        }
        d = d[x];
    }
};

// Arguments: x1, x2, x3, etc.
NArray.prototype.get = function () {
    var dimensions = this.dimensions;
    var d = this.data;
    for (var i = 0; i < dimensions; i++) {
        var x = arguments[i];
        d = d[x];
        if (!d) {
            break;
        }
    }
    return d;
};

// Arguments: x1, x2, x3, etc.
NArray.prototype.remove = function () {
    var dimensions = this.dimensions;
    var d = this.data;
    for (var i = 0; i < dimensions; i++) {
        var x = arguments[i];
        if (i === dimensions - 1) {
            d[x] = null;
            break;
        }

        d = d[x];
        if (!d) {
            break;
        }
    }
};

NArray.prototype.clear = function () {
    this.data.length = 0;
};

function VectorSet(dimensions) {
    this.data = new NArray(dimensions);
    this.list = [];
}

// Arguments: x1, x2, x3, etc.
VectorSet.prototype.add = function () {
    this.data.set.apply(this.data, Array.concat([true], arguments));
    this.list.push(Array.prototype.slice.call(arguments, 0));
};

// Arguments: x1, x2, x3, etc.
VectorSet.prototype.removeIndex = function (index) {
    this.data.remove.apply(this.data, this.list[index]);
    return this.list.splice(index, 1);
};

VectorSet.prototype.removeRandom = function () {
    var index = Math.floor(Math.random() * this.list.length);
    return this.removeIndex(index);
};

// Arguments: x1, x2, x3, etc.
VectorSet.prototype.contains = function () {
    return this.data.get(arguments);
};

VectorSet.prototype.getCount = function () {
    return this.list.length;
};

VectorSet.prototype.clear = function () {
    this.data.clear();
    this.list.length = 0;
};

function GameLayer() {
    Layer.call(this);
}

GameLayer.prototype = Object.create(Layer.prototype);

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
});
