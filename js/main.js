/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

// N-dimensional array
function NArray(dimensions) {
    // TODO
}

// Arguments: value, x1, x2, x3, etc.
NArray.prototype.set = function () {
    // TODO
};

// Arguments: x1, x2, x3, etc.
NArray.prototype.get = function () {
    // TODO
};

// Arguments: x1, x2, x3, etc.
NArray.prototype.remove = function () {
    // TODO
};

NArray.prototype.clear = function () {
    // TODO
};

function VectorSet(dimensions) {
    // TODO
}

VectorSet.prototype.add = function () {
    // TODO
};

VectorSet.prototype.removeIndex = function (index) {
    // TODO
};

VectorSet.prototype.removeRandom = function (index) {
    // TODO
};

VectorSet.prototype.contains = function (index) {
    // TODO
};

VectorSet.prototype.getCount = function (index) {
    // TODO
};

VectorSet.prototype.clear = function (index) {
    // TODO
};

function GameLayer() {
    Layer.call(this);
}

GameLayer.prototype = Object.create(Layer.prototype);

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
});
