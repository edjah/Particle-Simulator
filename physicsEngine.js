// An important object constructor and two useful functions
// TODO: Fix motionless particle with non-zero velocity due to posUpdate problem
// TODO: Fix absorb mode zoom issues
var Vector = function (x, y, z) {
    if (x === undefined) { this.x = 0; } else { this.x = x; }
    if (y === undefined) { this.y = 0; } else { this.y = y; }
    if (z === undefined) { this.z = 0; } else { this.z = z; }
    this.add = function (anotherVector, multFactor) {
        if (multFactor === undefined) { multFactor = 1 };
        return new Vector(this.x + anotherVector.x * multFactor, this.y + anotherVector.y * multFactor, this.z + anotherVector.z * multFactor);
    }
    this.subtract = function (anotherVector, multFactor) {
        if (multFactor === undefined) { multFactor = 1 };
        return new Vector(this.x - anotherVector.x * multFactor, this.y - anotherVector.y * multFactor, this.z - anotherVector.z * multFactor);
    }
    this.magnitude = function () {
        return Math.sqrt((this.x * this.x) + (this.y * this.y) + (this.z * this.z));
    }
    this.dist = function (anotherVector) {
        return this.subtract(anotherVector).magnitude();
    }
    this.dot = function (anotherVector) {
        return (this.x * anotherVector.x) + (this.y * anotherVector.y) + (this.z * anotherVector.z);
    }
    this.normalize = function () {
        var mag = this.magnitude();
        if (mag === 0) { mag = Infinity; }
        return new Vector(this.x/mag, this.y/mag, this.z/mag);
    }
    this.mult = function (factor) {
        return new Vector(this.x * factor, this.y * factor, this.z * factor);
    }
    this.get = function() {
        return new Vector(this.x, this.y, this.z);
    }
    this.round = function () {
        return new Vector(Math.round(this.x*100)/100, Math.round(this.y*100)/100, Math.round(this.z*100)/100);
    }
    this.project = function(anotherVector) {
        //Project ONTO anotherVector
        return anotherVector.mult(this.dot(anotherVector) / anotherVector.dot(anotherVector));
    }
}

// Who cares about libraries????
var random = function (a, b, integers) {
    if (integers === 1) {
        b = b + 1;
        return Math.floor(b - (b - a) * Math.random())
        
    } else {
        return b - (b - a) * Math.random();
    }
}
var fpsCounter = document.getElementById("fpscounter");
var fps = {
    startTime: 0,
    frameNumber: 0,
    getFPS: function() {		
        this.frameNumber++;		
        var d = new Date().getTime(), 
        currentTime = (d - this.startTime) / 1000,			
        result = Math.floor(this.frameNumber / currentTime);		
        if (currentTime > 1) {			
            this.startTime = new Date().getTime();	
            this.frameNumber = 0;		
        }
        return result;
    }	
};

//Important variables for assigning a velocity vector
var p1 = new Vector(0, 0);
var p2 = new Vector(0, 0);
var velocityToAssign = new Vector(0, 0);
var velocityVectorActive = false;

//Other important Global Variables
var G = 1; //Universal Gravitation Constant
var K = 0; //Coulomb's Constant
var numUniqueParticles = 1;
var simSpeed = 1;
var currentCharge = 0;
var currentMass = 400;
var elasticity = 1; //Must be between 0 and 1
var tracingPaths = true;
var absorbMode = false;
var trailLength = 100;
var netMomentum;
var netKineticEnergy;
var centerofmass;

// Deals with zoom
var scalar = 1.189;
var currentScalar = 1;

var centering = false;
var centeredParticle = null;
var recentCenter = false;

var isDragging = false;
var lastMousePos = new Vector();

var targetFrameRate = 60;
var animation;
var width = window.innerWidth - 200;
var height = window.innerHeight;
var screenCenter = new Vector(width/2, height/2);
var list = []; //An array of every particle in the system
var pathList = []; // An array of every corresponding path
var falseArray; // Literally an array containing just falses. It's the same length as list. Amazingly useful

var managePaths = function() {
    if (tracingPaths) {    
        for (var i = 0; i < list.length; i++) {
            if (list[i].path === undefined) {
                var startingPoint = {x: list[i].position.x, y: list[i].position.y};
                list[i].path = new path(list[i].pathID, startingPoint);
                pathList.push(list[i].path);
            }
        }
    }  else {
        pathList = [];
        for (var i = 0; i < list.length; i++) {
            list[i].path = undefined;
        }
    }
};

var dStringSplicer = function(dString, numPointsToRemove) {
    var a = dString;
    var b = numPointsToRemove;
    if (b === undefined) { b = 1 };
    var numSpacesFound = 0;
    var space;
    for (var i = 0; i < a.length; i++) {
        if (a[i] === " ") {
            numSpacesFound++;
            if (numSpacesFound === 1 + 3 * b) {
                space = i;
                a = a.substring(0, 1) + a.substring(space, a.length);
                break;
            }
        }
    }
    return a;
};

var path = function(pathID, initialPoint) {
    this.pathID = pathID;
    this.numPoints = 1;
    this.willBeDeleted = false;
    this.dString = "M " + initialPoint.x + " " + initialPoint.y;
    this.pathListID;
    this.update = function () {
        if (this.numPoints >= trailLength) {
            this.dString = dStringSplicer(this.dString, this.numPerFrame);
            this.numPoints -= 1;
        } 
        if (!this.willBeDeleted) {
            $(this.pathID).attr("d", this.dString);
        } else {
            pathList.splice(this.pathListID, 1); 
            $(this.pathID).fadeOut(2000, function() {
                $(this.pathID).remove();
            });
        }
    }
};

var Particle = function (htmlID, pathID, px, py, vx, vy, m, charge) {
    this.htmlID = htmlID;
    this.pathID = pathID;
    this.listID;
    this.position = new Vector(px, py);
    this.velocity = new Vector(vx, vy);
    this.acceleration = new Vector(0, 0);
    this.netForce = new Vector(0, 0);
    this.mass = m;
    this.momentum = this.velocity.mult(this.mass);
    this.radius = Math.sqrt(this.mass);
    this.charge = charge;
    this.recentCollide = [];
    this.growing = false;
    this.dString = "M " + this.position.x + " " + this.position.y;
    this.update = function () {
        this.acceleration = this.netForce.mult(1 / this.mass);
        this.velocity = this.velocity.add(this.acceleration, simSpeed);
        this.momentum = this.velocity.mult(this.mass);
        this.position = this.position.add(this.velocity, simSpeed);
        
        if (!this.growing) {
            $(this.htmlID).css("r", this.radius);
        }
        $(this.htmlID).css({
            "cx": this.position.x,
            "cy": this.position.y
        });
        
        if (tracingPaths) {
            this.path.dString += " L " + this.position.x + " " + this.position.y;
            this.path.numPoints ++;
        }
    };
    this.posUpdate = function () {
        this.position = this.position.add(this.velocity, simSpeed);

        $(this.htmlID).css({
            "r": this.radius,
            "cx": this.position.x,
            "cy": this.position.y
        });
        
        if (tracingPaths) {
            this.path.dString += " L " + this.position.x + " " + this.position.y;
            this.path.numPoints ++;
        }
    }
};

var velocityVector = function () {
    $("#canvas").mousemove(function (event) {
        if (event.which === 1 && velocityVectorActive) {
            p2.x = event.pageX - 200;
            p2.y = event.pageY;
            velocityToAssign.x = p2.x - p1.x;
            velocityToAssign.y = p2.y - p1.y;
            velocityToAssign = velocityToAssign.mult(1 / 30);
            $("#line").attr({"x1": p1.x, "y1": p1.y, "x2": p2.x, "y2": p2.y, "display": "inline"});
        }
    }) 
};

var createParticle = function (px, py, vx, vy, mass, charge, colorString) {
    if (px === undefined) { px = 0; }
    if (py === undefined) { py = 0; }
    if (vx === undefined) { vx = 0; }
    if (vy === undefined) { vy = 0; }
    if (mass === undefined) { mass = currentMass; }
    if (charge === undefined) { charge = 0; }
    var newTag = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    var newTagId = "particle" + numUniqueParticles;
    var newPath = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    var newPathId = "path" + numUniqueParticles;
    newTag.setAttribute("id", newTagId);
    newPath.setAttribute("id", newPathId);
    if (colorString == null) {
        colorString = "rgb(" + (Math.floor(Math.random() * (255 - 75)) + 75) + ", " + (Math.floor(Math.random() * (255 - 75)) + 75) + ", " + (Math.floor(Math.random() * (255 - 75)) + 75) + ")";
    }
    $("#canvas").prepend(newPath);
    $("#canvas").append(newTag);
    $("#" + newTagId).css({
        "cx": px,
        "cy": py,
        "r": Math.sqrt(mass),
        "fill": colorString
    });
    $("#" + newPathId).css("stroke", "#ffffff");
    $("#" + newPathId).attr({"d": "M " + px + " " + py, "fill": "none"});
    list.push(new Particle("#" + newTagId, "#" + newPathId, px, py, vx, vy, mass, charge));
    numUniqueParticles++;

    return list[list.length - 1];
};

var findCollisionGroups = function (particleList) {
    var groupings = [];
    for (var i = 0; i < particleList.length; i++) {
        if (particleList[i]) {
            for (var j = i + 1; j < list[i].recentCollide.length; j++) {
                if (list[i].recentCollide[j]) {
                    groupings.push([list[i], list[j]]);
                }
            }
        }
    }
    for (var i = 0; i < groupings.length; i++) {
        for (var j = i + 1; j < groupings.length; j++) {
            for (var a = 0; a < groupings[i].length; a++) {
                var shouldBreak = false;
                for (var b = 0; b < groupings[j].length; b++) {
                    if (groupings[i][a] === groupings[j][b]) {
                        groupings[i] = groupings[i].concat(groupings[j]);
                        groupings.splice(j, 1);
                        shouldBreak = true;
                        break;
                    }
                }
                if (shouldBreak) {
                    break;
                }
            }
        }
    }
    function filterDuplicates (item, pos) {
        return groupings[i].indexOf(item) == pos;
    }
    for (var i = 0; i < groupings.length; i++) {
        groupings[i] = groupings[i].filter(filterDuplicates);
    }
    return groupings;
};

var absorbCollision = function(collisionGroup) {
    // The most massive particle is one that absorbs the rest of the particles in collisionGroup
    // If there is no singular most massive particle, the largest one with the lowest index is selected
    var g = collisionGroup; // Less typing
    var maxMass = 0;
    var maxMassIndex;
    for (var i = g.length - 1; i >= 0; i--) {
        if (g[i].mass >= maxMass) {
            maxMass = g[i].mass;
            maxMassIndex = i;
        }
    }
    var a = g.splice(maxMassIndex, 1)[0]; // Largest particle
    for (var i = 0; i < g.length; i++) {
        b = g[i]
        a.momentum = a.momentum.add(b.momentum);
        a.position = a.position.mult(a.mass).add(b.position.mult(b.mass)).mult(1/(a.mass + b.mass));
        a.mass += b.mass;
        a.charge += b.charge;
        a.velocity = a.momentum.mult(1/a.mass);
        a.radius = Math.sqrt(a.mass);

        if (tracingPaths) { b.path.willBeDeleted = true; } 
        $(b.htmlID).insertBefore(a.htmlID);

        $(b.htmlID).animate(
            {"r": 0, "cx": a.position.x, "cy": a.position.y}, {
            duration: 300,
            complete: function() {
                $(b.htmlID).remove();
            }
        });
        
        // particle indices in 'list' change, so this part is an unfortunate necessity
        for (var j = 0; j < list.length; j++) {
            if (g[i].listID === list[j].listID) {
                if (list[j] == centeredParticle) {
                    centeredParticle = null;
                    centering = false;
                }
                list.splice(j, 1);
                break;
            }
        }
    }
    a.growing = true;
    $(a.htmlID).animate(
        {"r": a.radius}, 
        150, 
        function(){a.growing = false}
    );
};

// Not the best algorithm for simulating simulatenous collisions with multiple particles
// pretty buggy but it's good enough
var normalCollision = function (collisionGroup) {
    var group = collisionGroup;
    //Foward propagation
    for (var j = 0; j < group.length; j++) {
        var currentParticle = group[j];
        var impulsesToApply = [];
        for (var k = j + 1; k < group.length; k++) {
            var otherParticle = group[k];
            var impulse = calculateImpulse(currentParticle, otherParticle, group);
            currentParticle.velocity = currentParticle.velocity.subtract(impulse, 1/currentParticle.mass);
            otherParticle.velocity = otherParticle.velocity.add(impulse, 1/otherParticle.mass);
        }
    }

    //Backward propagation
    impulsesToApply = [];
    for (var j = group.length - 1; j >= 0; j--) {
        var currentParticle = group[j];
        var impulsesToApply = [];
        for (var k = j - 1; k >= 0; k--) {
            var otherParticle = group[k];
            var impulse = calculateImpulse(currentParticle, otherParticle, group);
            currentParticle.velocity = currentParticle.velocity.subtract(impulse, 1/currentParticle.mass);
            otherParticle.velocity = otherParticle.velocity.add(impulse, 1/otherParticle.mass);
        }
    }

    for (var i = 0; i < group.length; i++) {
        group[i].posUpdate();
    }
}

var calculateImpulse = function (particle1, particle2, collisionGroup) {
    var a = particle1;
    var b = particle2;
    var group = collisionGroup; // Only utilized if not a direct collision
    var impulse = new Vector();
    
    function searchForA (currentNode, currentPath, alreadyLooked, searchItem) {
        var currentNode = currentNode;
        var currentPath = currentPath;
        var alreadyLooked = alreadyLooked;
        var searchItem = searchItem;
        var itemsToSearch = [];
        for (var i  = 0; i < group.length; i++) {
            var canSearchThis = true;
            for (var j = 0; j < alreadyLooked.length; j++) {
                if (group[i].listID === alreadyLooked[j].listID) {
                    canSearchThis = false;
                    break;
                }
            }
            if (canSearchThis) {
                itemsToSearch.push(groups[i]);
            }
        }

        for (var i = 0; i < itemsToSearch.length; i++) {
            if (currentNode.recentCollide[itemsToSearch.listID]) {
                if (itemsToSearch[i].listID = searchItem.listID) {
                    currentPath.push(itemsToSearch[i]);
                }
            }
        }
    }
    if (b.recentCollide[a.listID]) {
        var direction = a.position.subtract(b.position).normalize();
        var relativeVelocity = a.velocity.subtract(b.velocity);
        var tempScalar = relativeVelocity.dot(direction);
        var conditionsMetForCollision = false;
        var epsilon = 0.1;
        var futurePos1 = a.position.add(a.velocity, epsilon);
        var futurePos2 = b.position.add(b.velocity, epsilon);
        if (a.position.dist(b.position) - futurePos1.dist(futurePos2) > 0.00001) {
            conditionsMetForCollision = true;
        }

        if (conditionsMetForCollision === true) {
            impulse = direction.mult(tempScalar * a.mass * b.mass * (1 + elasticity) / (a.mass + b.mass));
        } else {
            impulse = new Vector(0, 0, 0);
        }

        isDirectCollision = true;
    } else {
        var pathsFromBtoA = [];
        for (var i = 0; i < group.length; i++) {
            if (b.recentCollide[group[i].listID]) {
                currentPath = [];
                var foundA = false;
            }
        }
        
        var node;
        for (var i = 0; i < group.length; i++) {
            if (b.recentCollide[group[i].listID]) {
                node = group[i];
            }
        }

        var dir1 = b.position.subtract(node.position).normalize();
        var v1 = node.velocity.project(dir1);
        var dir2 = a.position.subtract(node.position).normalize();
        var v2 = v1.project(dir2).mult(1);


        var relativeVelocity = a.velocity.subtract(v2);
        var tempScalar = relativeVelocity.dot(dir2);
        impulse = dir2.mult(tempScalar * a.mass * node.mass * (1 + elasticity) / (a.mass + node.mass));
    }
    


    return impulse;
}

var collisionDetection = function () {
    var collisionStatusArray = falseArray.slice();
    for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
            if (list[i].position.dist(list[j].position) < (list[i].radius + list[j].radius)) {
                collisionStatusArray[i] = true;
                collisionStatusArray[j] = true;
                list[i].recentCollide[j] = true;
                list[j].recentCollide[i] = true;
            }
        }
    }

    var collisionGroups = findCollisionGroups(collisionStatusArray);
    if (collisionGroups.length > 0) {
        for (var i = 0; i < collisionGroups.length; i++) {
            if (absorbMode) {
                absorbCollision(collisionGroups[i]);
            } else {
                normalCollision(collisionGroups[i]);
            }
        }
    }

    netKineticEnergy = 0;
    for (var i = 0; i < list.length; i++) {
        netKineticEnergy += 0.5 * list[i].mass * Math.pow(list[i].velocity.magnitude(), 2);
    }
};

var calculateForces = function() {
    //This zeros out the forces on each object before the loop
    for (var i = 0; i < list.length; i++) { 
        list[i].netForce.x = 0;
        list[i].netForce.y = 0;
    }
    
    //This calculates the gravitational and electromagnetic forces that each particle experiences
    for (var i = 0; i < list.length; i++) {
        for (var j = 0; j < list.length; j++) {
         if (i !== j && typeof list[i] !== 'undefined' && typeof list[j] !== 'undefined') {
            var displacement = list[i].position.subtract(list[j].position);
            var direction = displacement.normalize();
            if (displacement.magnitude() > list[i].radius + list[j].radius) {
                var forceMagnitude = ((G * list[i].mass * list[j].mass) + (-K * list[i].charge * list[j].charge)) / Math.pow(displacement.magnitude(), 2);
                    list[i].netForce = list[i].netForce.subtract(direction.mult(forceMagnitude), 0.5); // Multiplied by 0.5 because the process is repeated twice for each particle
                    list[j].netForce = list[j].netForce.add(direction.mult(forceMagnitude), 0.5);
                }
            }
        }
    }
};
function reset() {
    G = 1; $("#gravity").prop("value", 15);
    K = 0; $("#coulomb").prop("value", 15);
    currentScalar = 1;
    centering = false;
    centeredParticle = null;
    numUniqueParticles = 1;
    simSpeed = 1; $("#simspeed").prop("value", 20);
    currentCharge = 0; $("#charge").prop("value", 50);
    currentMass = 400; $("#mass").prop("value", 65);
    elasticity = 1; $("#elasticity").prop("value", 100);
    absorbMode = false; $("#absorb").attr('checked', false);
    trailLength = 100; $("#trail-length").prop("value", 25);
    tracingPaths = true;
    for (var i = 0; i < list.length; i++)
    {
        $(list[i].htmlID).remove();
        $(list[i].pathID).remove();
    }
    list = [];
    pathList = [];
}
function clearPaths() {
    for (var i = 0; i < list.length; i++)
    {
        if (list[i].path != null) {
            list[i].path.dString = "M " + list[i].position.x + " " + list[i].position.y;
            list[i].path.numPoints = 1;
        }

    }
}
function zoomIn(numTimes, centerX, centerY) {
    if (centerX == null || centerY == null) {
        centerX = screenCenter.x;
        centerY = screenCenter.y;
    }
    if (numTimes == null) {
        numTimes = 1;
    }
    for (var j = 0; j < numTimes; j++) {
        G *= scalar;
        K *= scalar;
        currentMass *= scalar * scalar;
        currentScalar *= scalar;
        for (var i = 0; i < list.length; i++) {
            list[i].mass *= scalar * scalar;
            list[i].radius *= scalar;
            list[i].charge *= scalar * scalar;
            list[i].position.x = centerX + (list[i].position.x - centerX) * scalar;
            list[i].position.y = centerY + (list[i].position.y - centerY) * scalar;
            list[i].velocity.x *= scalar;
            list[i].velocity.y *= scalar;
        }
    }
    if (centering) {
        recentCenter = true;
    }
    clearPaths();
}
function zoomOut(numTimes, centerX, centerY) {
    if (centerX == null || centerY == null) {
        centerX = screenCenter.x;
        centerY = screenCenter.y;
    }
    if (numTimes == null) {
        numTimes = 1;
    }
    for (var j = 0; j < numTimes; j++) {
        G /= scalar;
        K /= scalar;
        currentMass /= scalar * scalar;
        currentScalar /= scalar;
        for (var i = 0; i < list.length; i++) {
            list[i].mass /= scalar * scalar;
            list[i].radius /= scalar;
            list[i].charge /= scalar * scalar;
            list[i].position.x = centerX + (list[i].position.x - centerX) / scalar;
            list[i].position.y = centerY + (list[i].position.y - centerY) / scalar;
            list[i].velocity.x /= scalar;
            list[i].velocity.y /= scalar;
        }
    }
    if (centering) {
        recentCenter = true;
    }

    clearPaths();
}
function moveCam(direction) {
    switch(direction) {
        case "up":
            for (var i = 0; i < list.length; i++) {
                list[i].position.y -= 10;
            }
            break;
        case "down":
            for (var i = 0; i < list.length; i++) {
                list[i].position.y += 10;
            }
            break;
        case "left":
            for (var i = 0; i < list.length; i++) {
                list[i].position.x += 10;
            }
            break;
        case "right":
            for (var i = 0; i < list.length; i++) {
                list[i].position.x -= 10;
            }
            break;
    }
    clearPaths();   
}
function center(particle) {
    if (particle != null) {
        var shift = screenCenter.subtract(particle.position);
        for (var i = 0; i < list.length; i++) {
            list[i].position = list[i].position.add(shift);
        }
        if (recentCenter) {
            clearPaths();
            recentCenter = false;
        }
    }

}
$(document).keydown(function(e) {
    switch (e.which) {
        case 38: moveCam("down"); break;
        case 40: moveCam("up"); break;
        case 37: moveCam("left"); break;
        case 39: moveCam("right"); break;
        case 90: zoomIn(); break;
        case 88: zoomOut(); break;
        case 67:
            if (!centering) {
                centeredParticle = list[0];
                for (var i = 0; i < list.length; i++) {
                    if (list[i].mass > centeredParticle.mass) {
                        centeredParticle = list[i];
                    }
                }
                centering = true;
                center(centeredParticle);
                clearPaths();
            }
            else {
                centering = false;
            }

    }
});
$(window).resize(function() {  
    width = window.innerWidth - 200;
    height = window.innerHeight;
    screenCenter = new Vector(width/2, height/2);
    clearPaths();
});
$('#canvas').mousewheel(function(event) {
    if (event.deltaY > 0) {
        zoomIn(1, event.pageX - 200, event.pageY);
    }
    else {
        zoomOut(1, event.pageX - 200, event.pageY)
    }
});

$("#canvas").mousedown(function(event) {
    if (event.which === 1) {
        p1.x = event.pageX - 200;
        p1.y = event.pageY;
        velocityVectorActive = true;
        velocityVector();
    }
    else if (event.which == 3 && !isDragging) {
        isDragging = true;
        lastMousePos.x = event.pageX;
        lastMousePos.y = event.pageY;
    }
    else if (event.which == 2) {
        if (centering) {
            centering = false;
        }
        else {
            var mousePosVector = new Vector(event.pageX - 200, event.pageY);
            for (var i = 0; i < list.length; i++) {
                if (mousePosVector.dist(list[i].position) < list[i].radius) {
                    centeredParticle = list[i];
                    centering = true;
                    center(centeredParticle);
                    clearPaths();
                    break;
                }
            }
        }
    }
    
});
$("#canvas").mouseleave(function() {
   if (velocityVectorActive) {
    velocityVectorActive = false;
    $("#line").attr("display", "none");
    createParticle(p1.x, p1.y, velocityToAssign.x, velocityToAssign.y, currentMass, currentCharge);
    velocityToAssign = new Vector(0, 0);
    p1 = new Vector(0, 0);
    p2 = new Vector(0, 0);
}
});

$("#canvas").mouseup(function() {
    isDragging = false;
    if (velocityVectorActive) {
        velocityVectorActive = false;
        $("#line").attr("display", "none");
        createParticle(p1.x, p1.y, velocityToAssign.x, velocityToAssign.y, currentMass, currentCharge);
        velocityToAssign = new Vector(0, 0);
        p1 = new Vector(0, 0);
        p2 = new Vector(0, 0);
    }
});

$("#canvas").mousemove(function(e){
    if(isDragging && !centering) {
        var currentMousePos = new Vector(e.pageX, e.pageY);
        var diff = currentMousePos.subtract(lastMousePos);
        for (var i = 0; i < list.length; i++) {
            list[i].position.x += diff.x;
            list[i].position.y += diff.y;
        }
        lastMousePos = currentMousePos.get();
        clearPaths();
    }
});



$("#simspeed").on("input", function() {
    simSpeed = this.value / 20;
});
$("#elasticity").on("input", function() {
    elasticity = this.value / 100;
});
$("#mass").on("input", function() {
    currentMass = 20 * Math.exp(this.value * 0.046051701);
});
$("#charge").on("input", function() {
    currentCharge = (this.value - 50) * 10;
});
$("#gravity").on("input", function() {
    G = Math.exp(this.value * 0.046151205) - 1;
});
$("#coulomb").on("input", function() {
    K = Math.exp(this.value * 0.046151205) - 1;
});
$("#trail-length").on("input", function() {
    var oldTrailLength = trailLength;
    trailLength = 4 * this.value;
    if (this.value == 0) {
        for (var i = 0; i < list.length; i++) { 
            $(list[i].path.pathID).attr("d", "");
        }
        pathList = [];
        tracingPaths = false;
    } else {
        tracingPaths = true;
    }
    if (tracingPaths && oldTrailLength > trailLength) {
        for (var i = 0; i < pathList.length; i++) {
            pathList[i].dString = dStringSplicer(pathList[i].dString, pathList[i].numPoints - trailLength)
            pathList[i].numPoints = trailLength;
        }
    }

});
$("#absorb").on("change", function() {
    absorbMode = !absorbMode;
});
$("#showpath").on("change", function() {
    tracingPaths = !tracingPaths;
})
$("#reset").click(function() {
    reset();
});

$("#presetGroup1").click(function(){
    $("#dropdownGroup1").show();
});

window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {

    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

// Sun-Earth-Moon
$("#preset1").click(function(){
    reset();
    centering = true;
    createParticle(700, 500, 0, 0.47, 20000, 0, "rgb(255, 255, 0)");
    createParticle(1300, 500, 0, -5.77, 1000, 0, "rgb(0, 255, 30)");
    centeredParticle = createParticle(1400, 500, 0, -8.93, 100, 0, "rgb(70, 70, 70)");
    zoomOut(4);
});

// Star Dance
$("#preset2").click(function(){
    reset();
    createParticle(500, 450, -1.118, 0, 250, 0, "#d43353");
    createParticle(500, 550, 1.118, 0, 250, 0, "#22d422");
    createParticle(1100, 450, -1.118, 0, 250, 0, "#3d68cc");
    createParticle(1100, 550, 1.118, 0, 250, 0, "#cc783d");
});

// Double Binary
$("#preset3").click(function(){
    reset();
    createParticle(500, 450, -1.118, 0.645, 250, 0, "#d43353");
    createParticle(500, 550, 1.118, 0.645, 250, 0, "#22d422");
    createParticle(1100, 450, -1.118, -0.645, 250, 0, "#3d68cc");
    createParticle(1100, 550, 1.118, -0.645, 250, 0, "#cc783d");
});



// A CLOUD OF PARTICLES!
var cloud = function (cloudCenterX, cloudCenterY, numParticles) {
    if (numParticles === undefined) { numParticles = 10; }
    if (numParticles < 0) { numParticles = 0; }
    if (numParticles > 100) { numParticles = 100; }
    var angle = 0;
    for (var i = 0; i < numParticles; i++) {
        var magnitude = random(0, 200);
        var px = cloudCenterX + magnitude*Math.cos(angle);
        var py = cloudCenterY + magnitude*Math.sin(angle);
        var vx = random(-2, 2);
        var vy = random(-2, 2);
        var mass = 16;
        var charge = 0;
        createParticle(px, py, vx, vy, mass, charge);
        angle += 2*Math.PI/numParticles;
    }
}

var drawFrame = function () {
    managePaths();
    calculateForces();
    falseArray = [];

    if (centering) {
        center(centeredParticle);
    }
    for (var i = 0; i < list.length; i++) {
        falseArray[i] = false;
    }

    netMomentum = new Vector(0, 0);
    centerofmass = new Vector(0, 0);
    netKineticEnergy  = 0;

    for (var i = 0; i < list.length; i++) {
        list[i].listID = i;
        list[i].recentCollide = falseArray.slice();
        list[i].update();
        netMomentum.x += list[i].momentum.x;
        netMomentum.y += list[i].momentum.y;
        netKineticEnergy += 0.5 * list[i].mass * Math.pow(list[i].velocity.magnitude(), 2);
    }

    for (var i = 0; i < pathList.length; i++) {
        pathList[i].pathListID = i;
        pathList[i].update();   
    }

    var sumofmasses = 0;
    for (var i = 0; i < list.length; i++) {
        centerofmass = centerofmass.add(list[i].position, list[i].mass);
        sumofmasses += list[i].mass;
    }
    centerofmass = centerofmass.mult(1/sumofmasses);

    collisionDetection();
};


animation = setInterval(function () {
    drawFrame();
    fpsCounter.innerHTML = "FPS: " + fps.getFPS();
}, 1000/targetFrameRate);
