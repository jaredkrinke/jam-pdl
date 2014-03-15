﻿/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

Constants = {
    directions: [[-1, 0], [1, 0], [0, 1], [0, -1]],
    directionValues: { left: 0, right: 1, up: 2, down: 3 },
};

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
    var a = Array.prototype.slice.call(arguments, 0);
    a.unshift(true);
    this.data.set.apply(this.data, a);
    this.list.push(Array.prototype.slice.call(arguments, 0));
};

// Arguments: x1, x2, x3, etc.
VectorSet.prototype.removeIndex = function (index) {
    this.data.remove.apply(this.data, this.list[index]);
    return this.list.splice(index, 1)[0];
};

VectorSet.prototype.removeRandom = function () {
    var index = Math.floor(Math.random() * this.list.length);
    return this.removeIndex(index);
};

// Arguments: x1, x2, x3, etc.
VectorSet.prototype.contains = function () {
    return this.data.get.apply(this.data, arguments);
};

VectorSet.prototype.getCount = function () {
    return this.list.length;
};

VectorSet.prototype.clear = function () {
    this.data.clear();
    this.list.length = 0;
};

function Player(world) {
    Entity.call(this);
    this.world = world;
    this.directionsPressed = [];
    this.moveTimer = 0;
    this.active = true;

    this.moved = new Event();
}

Player.movePeriod = 150;
Player.moveChargePeriod = 200;
Player.prototype = Object.create(Entity.prototype);

Player.prototype.reset = function () {
    this.directionsPressed.length = 0;
    this.moveTimer = 0;
    this.active = true;
    this.x = 0;
    this.y = 0;
};

Player.prototype.move = function (direction) {
    if (this.active) {
        var offsets = Constants.directions[direction];
        if (this.world.checkMove(this.x, this.y, direction)) {
            this.x += offsets[0];
            this.y += offsets[1];
            this.world.ensureColumnsComplete(this.x);
            this.moved.fire(this.x, this.y);
            return true;
        }
    }

    return false;
};

Player.prototype.checkAnyDirectionPressed = function () {
    return this.directionsPressed.length > 0;
};

Player.prototype.directionPressed = function (direction, pressed) {
    if (pressed) {
        // Move immediately and start charging for automatic moves
        this.move(direction);
        this.moveTimer = Player.moveChargePeriod;

        // Push this onto the top of the direction stack
        this.directionsPressed.push(direction);
    } else {
        // Remove all entries for this direction
        do {
            var index = this.directionsPressed.indexOf(direction);
            if (index !== -1) {
                this.directionsPressed.splice(index, 1);
            }
        } while (index !== -1);
    }
};

Player.prototype.update = function (ms) {
    if (this.active && this.checkAnyDirectionPressed()) {
        this.moveTimer -= ms;

        while (this.moveTimer <= 0) {
            // Move the most recent possible non-conflicting direction
            var moved = false;
            var triedHorizontal = false;
            var triedVertical = false;
            for (var i = this.directionsPressed.length - 1; !moved && i >= 0; i--) {
                var direction = this.directionsPressed[i];
                var offsets = Constants.directions[direction];
                if ((!triedHorizontal && !offsets[0]) || (!triedVertical && !offsets[1])) {
                    moved = this.move(this.directionsPressed[i]);
                    triedHorizontal = triedHorizontal || offsets[0];
                    triedVertical = triedVertical || offsets[1];
                }
            }

            this.moveTimer += Player.movePeriod;
        }
    }
};

function Ender() {
    Entity.call(this, Ender.startX);
    this.moved = new Event();
    this.reset();
}

Ender.startX = -14;
Ender.initialMovePeriod = 600;
Ender.prototype = Object.create(Entity.prototype);

Ender.prototype.reset = function () {
    this.x = Ender.startX;
    this.movePeriod = Ender.initialMovePeriod;
    this.moveTimer = this.movePeriod;
};

Ender.prototype.update = function (ms) {
    this.moveTimer -= ms;
    while (this.moveTimer <= 0) {
        this.x++;
        this.moved.fire(this.x);
        this.moveTimer += this.movePeriod;
    }
};

function World() {
    Entity.call(this);

    // Bounds (inclusive, note that there is no limit to the right)
    this.x1 = 0;
    this.y1 = 0;
    this.y2 = 8;

    this.lastColumn = this.x1;

    // World contents
    this.walls = new NArray(3);
    this.squares = new NArray(2);

    // World state
    this.squaresUsed = new VectorSet(2);
    this.wallsAvailable = new VectorSet(3);
    this.wallsConsidered = new VectorSet(3);

    // Events
    this.changed = new Event();
}

World.prototype = Object.create(Entity.prototype);
World.minColumns = 32;
World.offsetWalls = [[-1, 0], [0, 0], [0, 0], [0, -1]];
World.wallAxes = [1, 1, 0, 0];
World.wallOffsets = [
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0]],
];

World.prototype.reset = function () {
    this.lastColumn = 1;
    this.walls.clear();
    this.squares.clear();

    this.squaresUsed.clear();
    this.wallsAvailable.clear();
    this.wallsConsidered.clear();

    this.annexSquare(0, 0);
    this.ensureColumnsComplete(1);
};

World.prototype.forEachSquareWall = function (x, y, f) {
    var count = World.offsetWalls.length;
    for (var i = 0; i < count; i++) {
        var offset = World.offsetWalls[i];
        var wallX = x + offset[0];
        var wallY = y + offset[1];

        f.call(this, World.wallAxes[i], wallX, wallY, i);
    }
};

World.prototype.ensureWalls = function (x, y) {
    this.forEachSquareWall(x, y, function (axis, x, y, direction) {
        if (this.walls.get(axis, x, y) === undefined) {
            this.walls.set(true, axis, x, y);
        }
    });
};

World.prototype.ensureSquare = function (x, y) {
    if (!this.squares.get(x, y)) {
        this.squares.set(true, x, y);
        this.ensureWalls(x, y);
    }
};

World.prototype.checkWallRemovable = function (axis, x, y) {
    var x1 = this.x1 - 1;
    var y1 = this.y1 - 1;
    var y2 = this.y2;

    if (axis === 0) {
        return x >= x1 && y > y1 && y < y2;
    } else
    {
        return x > x1 && y >= y1 && y <= y2;
    }
};

World.prototype.annexSquare = function (x, y) {
    this.squaresUsed.add(x, y);
    this.ensureSquare(x, y);
    this.forEachSquareWall(x, y, function (axis, wallX, wallY) {
        if (!this.wallsConsidered.contains(axis, wallX, wallY)
            && !this.wallsAvailable.contains(axis, wallX, wallY)
            && this.checkWallRemovable(axis, wallX, wallY)) {
            this.wallsAvailable.add(axis, wallX, wallY);
        }
    });
};

World.prototype.removeWall = function (axis, x, y) {
    this.walls.set(false, axis, x, y);
};

World.prototype.carve = function () {
    var carved = false;

    while (!carved && this.wallsAvailable.getCount()) {
        var position = this.wallsAvailable.removeRandom();
        var axis = position[0];
        var wallX = position[1];
        var wallY = position[2];
        var offsets = World.wallOffsets[axis];

        this.wallsConsidered.add(axis, wallX, wallY);

        var count = offsets.length;
        for (var i = 0; i < count; i++) {
            var offset = offsets[i];
            var x = wallX + offset[0];
            var y = wallY + offset[1];

            if (!this.squaresUsed.contains(x, y)) {
                this.removeWall(axis, wallX, wallY);
                this.annexSquare(x, y);
                carved = true;
            }
        }
    }
};

World.prototype.ensureWallConsidered = function (axis, wallX, wallY) {
    while (!this.wallsConsidered.contains(axis, wallX, wallY)) {
        this.carve();
    }
};

World.prototype.ensureColumnComplete = function (x) {
    for (var y = this.y1; y <= this.y2; y++) {
        this.ensureSquare(x, y);
        this.forEachSquareWall(x, y, function (axis, wallX, wallY) {
            if (this.checkWallRemovable(axis, wallX, wallY)) {
                this.ensureWallConsidered(axis, wallX, wallY);
            }
        });
    }
};

World.prototype.ensureColumnsComplete = function (x1) {
    var x2 = x1 + World.minColumns;
    while (this.lastColumn <= x2) {
        this.ensureColumnComplete(this.lastColumn);
        this.lastColumn++;
    }

    this.changed.fire();
};

World.prototype.checkMove = function (x, y, direction) {
    var axis = World.wallAxes[direction];
    var wallOffset = World.offsetWalls[direction];
    var wallX = x + wallOffset[0];
    var wallY = y + wallOffset[1];

    if (this.walls.get(axis, wallX, wallY)) {
        return false;
    }
    return true;
};

function Manager(world, player, ender) {
    Entity.call(this);
    this.world = world;
    this.player = player;
    this.ender = ender;

    this.level = 0;
    this.score = 0;
    this.ended = false;

    this.scoreChanged = new Event();
    this.levelChanged = new Event();
    this.lost = new Event();

    var manager = this;
    player.moved.addListener(function (x, y) {
        var lastScore = manager.score;
        manager.score = Math.max(manager.score, x);
        if (manager.score != lastScore) {
            manager.scoreChanged.fire(manager.score);
        }
    });
};

Manager.levelMovePeriodDelta = 25;
Manager.levelLength = 50;
Manager.prototype = Object.create(Entity.prototype);

Manager.prototype.reset = function () {
    this.level = 0;
    this.score = 0;
    this.ended = false;
};

Manager.prototype.update = function (ms) {
    // Check for loss
    if (!this.ended && this.ender.x >= this.player.x) {
        this.lost.fire();
        this.ended = true;
    }

    // Check for level up
    var lastLevel = this.level;
    this.level = Math.max(this.level, Math.floor(this.player.x / Manager.levelLength));
    if (this.level != lastLevel) {
        this.ender.movePeriod = Math.max(100, Ender.initialMovePeriod - this.level * Manager.levelMovePeriodDelta);
        this.levelChanged.fire(level);
    }
};

function Display(world, player, ender, manager) {
    this.world = world;
    this.player = player;
    this.rows = world.y2 - world.y1 + 1;
    this.columns = 640 / Display.squareSize;
    Entity.call(this, (-this.columns / 2 + 0.5) * Display.squareSize, (-this.rows / 2 + 0.5) * Display.squareSize, Display.squareSize, Display.squareSize);

    // Viewport
    this.viewportChanged = new Event();
    this.vx1 = 0;
    this.vy1 = 0;

    // Walls
    this.walls = [[], []];
    this.wallsEntity = new Entity();
    this.wallsEntity.elements = [];
    this.forEachWall(function (axis, x, y) {
        if (!this.walls[axis][x]) {
            this.walls[axis][x] = [];
        }

        if (axis === 0) {
            this.wallsEntity.elements.push(this.walls[0][x][y] = new Rectangle(x, y + 0.5, 1, Display.wallSizeRelative, 'white'));
        } else {
            this.wallsEntity.elements.push(this.walls[1][x][y] = new Rectangle(x + 0.5, y, Display.wallSizeRelative, 1, 'white'));
        }
    }, this);

    var display = this;
    world.changed.addListener(function () {
        display.updateWalls();
    });

    // Ender
    this.enderEntity = new Entity(0, this.rows / 2 - 0.5, 2);
    this.enderEntity.opacity = 0.8;
    this.enderEntity.elements = [new Rectangle(0, 0, 1, this.rows, 'red')];
    this.updateEnder = function () {
        display.enderEntity.x = ender.x - display.vx1;
    };
    ender.moved.addListener(function () {
        display.updateEnder();

        // TODO: Sound
    });

    // Player
    this.playerEntity = new Entity();
    this.playerEntity.elements = [new Rectangle(0, 0, Display.playerSizeRelative, Display.playerSizeRelative, 'white')];
    var centerThreshold = Math.floor(this.columns / 12);
    this.playerMoved = function (x, y) {
        // Center the view
        var center = Math.floor(display.columns / 2);
        var centerX = center + display.vx1;
        var viewportChanged = false;

        if (centerX - player.x > centerThreshold) {
            display.vx1 = centerThreshold + player.x - center;
            viewportChanged = true;
        } else if (centerX - player.x < -centerThreshold) {
            display.vx1 = -centerThreshold + player.x - center;
            viewportChanged = true;
        }

        if (viewportChanged) {
            display.updateWalls();
            display.updateEnder();
            // TODO: Viewport updates?
            //display.viewportChanged.fire(display.getViewport());
        }

        // Update the player element
        display.playerEntity.x = x - display.vx1;
        display.playerEntity.y = y - display.vy1;
    };
    player.moved.addListener(this.playerMoved);

    // TODO: Background

    // End effect
    manager.lost.addListener(function () {
        display.removeChild(display.playerEntity);
        // TODO: Ghost effect
    });
}

Display.squareSize = 20;
Display.wallSizeRelative = 0.125;
Display.playerSizeRelative = 0.5;
Display.prototype = Object.create(Entity.prototype);

Display.prototype.reset = function () {
    this.clearChildren();
    this.addChild(this.wallsEntity);
    this.addChild(this.playerEntity);
    this.addChild(this.enderEntity);
    // TODO: Ender, player, background

    this.vx1 = 0;
    this.vy1 = 0;
    this.updateWalls();
    this.playerMoved(this.player.x, this.player.y);
    // TODO: Update player and background positions
};

Display.prototype.forEachWall = function (f, that) {
    var columnCount = this.columns;
    for (var x = -1; x < columnCount; x++) {
        var rowCount = this.rows;
        for (var y = -1; y < rowCount; y++) {
            if (x > -1) {
                f.call(that, 0, x, y);
            }

            if (y > -1) {
                f.call(that, 1, x, y);
            }
        }
    }
};

Display.prototype.updateWalls = function () {
    this.forEachWall(function (axis, x, y) {
        var wallElement = this.walls[axis][x][y];
        if (this.world.walls.get(axis, x + this.vx1, y + this.vy1)) {
            wallElement.opacity = 1;
        } else {
            wallElement.opacity = 0;
        }
    }, this);
};

function GameLayer() {
    Layer.call(this);
    var paused = false;
    this.paused = paused;

    // TODO: End game, other entities

    this.addEntity(this.world = new World());
    this.addEntity(this.player = new Player(this.world));
    this.addEntity(this.ender = new Ender());
    this.addEntity(this.manager = new Manager(this.world, this.player, this.ender));
    this.addEntity(this.display = new Display(this.world, this.player, this.ender, this.manager));
    this.reset();

    var layer = this;
    this.manager.lost.addListener(function () {
        layer.player.active = false;
        layer.paused = true;
    });

    // Controls
    var player = this.player;
    var createDirectionHandler = function (directionName) {
        return function (pressed) {
            if (!paused) {
                player.directionPressed(Constants.directionValues[directionName], pressed);
            }
        };
    };

    this.keyPressedHandlers = {
        left: createDirectionHandler('left'),
        right: createDirectionHandler('right'),
        up: createDirectionHandler('up'),
        down: createDirectionHandler('down'),

        // TODO: enter/escape
    };
}

GameLayer.prototype = Object.create(Layer.prototype);

GameLayer.prototype.reset = function () {
    this.paused = false;
    this.world.reset();
    this.display.reset();
    this.player.reset();
    this.ender.reset();
    this.manager.reset();
    // TODO: Reset other stuff as it's added
};

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
});
