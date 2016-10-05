// An important object constructor and two useful functions
// TODO: Fix motionless particle with non-zero velocity due to posUpdate problem
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
        return distance = this.subtract(anotherVector).magnitude();
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

var targetFrameRate = 60;
var animation;
var width = window.innerWidth;
var height = window.innerHeight;
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
    this.dString = "M " + this.position.x + " " + this.position.y;
    this.update = function () {
        this.acceleration = this.netForce.mult(1 / this.mass);
        this.velocity = this.velocity.add(this.acceleration, simSpeed);
        this.momentum = this.velocity.mult(this.mass);
        this.position = this.position.add(this.velocity, simSpeed);
        
        $(this.htmlID).attr({
            "r": this.radius,
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

        $(this.htmlID).attr({
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

var createParticle = function (px, py, vx, vy, mass, charge) {
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
    var colorString = "rgb(" + (Math.floor(Math.random() * (255 - 75)) + 75) + ", " + (Math.floor(Math.random() * (255 - 75)) + 75) + ", " + (Math.floor(Math.random() * (255 - 75)) + 75) + ")";
    $("#canvas").prepend(newPath);
    $("#canvas").append(newTag);
    $("#" + newTagId).attr({
        "cx": px,
        "cy": py,
        "r": Math.sqrt(mass),
        "fill": colorString
    });
    $("#" + newPathId).css("stroke", "#ffffff");
    $("#" + newPathId).attr({"d": "M " + px + " " + py, "fill": "none"});
    list.push(new Particle("#" + newTagId, "#" + newPathId, px, py, vx, vy, mass, charge));
    numUniqueParticles++;
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
        $(b.htmlID).animate({
            "r": 0,
            "cx": a.position.x,
            "cy": a.position.y,
        }, 300, function() {
            $(b.htmlID).remove();
        });
        
        // particle indices in 'list' change, so this part is an unfortunate necessity
        for (var j = 0; j < list.length; j++) {
            if (g[i].listID === list[j].listID) {
                list.splice(j, 1);
                break;
            }
        }
    }

    $(a.htmlID).animate({
        "r": a.radius,
    }, 150);
    
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
    console.log(b.recentCollide[a.listID])
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
        console.log(impulse)
        console.log(node.listID + " " + a.listID)
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
                //clearInterval(animation);
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
    //console.log(netKineticEnergy);
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

$("#canvas").mousedown(function(event) {
    if (event.which === 1) {
        p1.x = event.pageX - 200;
        p1.y = event.pageY;
        velocityVectorActive = true;
        velocityVector();
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
    if (velocityVectorActive) {
        velocityVectorActive = false;
        $("#line").attr("display", "none");
        createParticle(p1.x, p1.y, velocityToAssign.x, velocityToAssign.y, currentMass, currentCharge);
        velocityToAssign = new Vector(0, 0);
        p1 = new Vector(0, 0);
        p2 = new Vector(0, 0);
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
$("#absorb").on("change", function() {
    absorbMode = !absorbMode;
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
