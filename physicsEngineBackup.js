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
}
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
}

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
}
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
}

var Particle = function (htmlID, pathID, px, py, vx, vy, m, charge) {
    this.htmlID = htmlID;
    this.pathID = pathID;
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

var collide = function(i, j) {
    // Making sure that 'i' is the more massive particle
    tempj = j; 
    if (list[i].mass < list[j].mass) {
        j = i;
        i = tempj;
    }
    //So I don't have to rewrite list[i] and list[j] a million times
    var a = list[i]; 
    var b = list[j];
    var centerofmass = a.position.mult(a.mass).add(b.position.mult(b.mass)).mult(1/(a.mass + b.mass));
    
    if (elasticity === 0) {
        a.momentum = a.momentum.add(b.momentum);
        a.position = centerofmass;
        a.mass += b.mass;
        a.charge += b.charge;
        a.radius = (Math.sqrt(a.mass));
        a.velocity = a.momentum.mult(1/a.mass);
        $(b.htmlID).remove();
        if (tracingPaths) { b.path.willBeDeleted = true; }
        list.splice(j, 1);
    } else {
        if (list[i].recentCollide[j] && list[j].recentCollide[i]) {
            var direction = a.position.subtract(b.position).normalize();
            var relativeVelocity = a.velocity.subtract(b.velocity);
            var tempScalar = relativeVelocity.dot(direction);
            impulse = direction.mult(tempScalar * a.mass * b.mass * (1 + elasticity) / (a.mass + b.mass));
            a.velocity = a.velocity.subtract(impulse, 1/a.mass);
            b.velocity = b.velocity.add(impulse, 1/b.mass);
            a.posUpdate();
            b.posUpdate();
        }
    }
};

var findCollisionGroups = function (particleList) {
    var group = function (a, b) {
        this.particles = [a, b];
        this.comVelocity = new Vector(0, 0, 0);
    }
    var groupings = [];
    for (var i = 0; i < particleList.length; i++) {
        if (particleList[i]) {
            for (var j = i + 1; j < list[i].recentCollide.length; j++) {
                if (list[i].recentCollide[j]) {
                    groupings.push(new group(i, j));
                }
            }
        }
    }
    for (var i = 0; i < groupings.length; i++) {
        for (var j = i + 1; j < groupings.length; j++) {
            for (var a = 0; a < groupings[i].particles.length; a++) {
                var shouldBreak = false;
                for (var b = 0; b < groupings[j].particles.length; b++) {
                    if (groupings[i].particles[a] === groupings[j].particles[b]) {
                        groupings[i].particles = groupings[i].particles.concat(groupings[j].particles);
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
        return groupings[i].particles.indexOf(item) == pos;
    }
    for (var i = 0; i < groupings.length; i++) {
        groupings[i].particles = groupings[i].particles.filter(filterDuplicates);
        var tempSumMasses = 0;
        for (var j = 0; j < groupings[i].particles.length; j++) {
            var a = groupings[i];
            groupings[i].comVelocity = a.comVelocity.add(list[a.particles[j]].velocity, list[a.particles[j]].mass);
            tempSumMasses += list[a.particles[j]].mass;
        }
        groupings[i].comVelocity = groupings[i].comVelocity.mult(1/tempSumMasses);
    }
    return groupings;
};

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
            var a = collisionGroups[i].particles;
            if (collisionGroups[i].particles.length === 2) {
                collide(a[0], a[1]);
            } else {  
                
            }
        }
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

var checkConnections = function (particlesThatCollidedList) {
    var connectionsList = [];
    var connection = function(base) {
        this.base = base;
        this.explicit = [];
        this.implicit = [];
    }
    for (var i = 0; i < particlesThatCollidedList.length; i++) {
        if (particlesThatCollidedList[i] === true) {
            connectionsList.push(new connection(list[i]));
            for (var j = 0; j < list[i].recentCollide.length; j++) {
                if (list[i].recentCollide[j] === true) {
                   connectionsList[connectionsList.length - 1].explicit.push(list[j]);
                }
            }
        }
    }
    for (var a = 0; a < connectionsList.length; a++) {
        for (var b = 0; b < connectionsList[a].explicit.length; b++) {
            for (var c = 0; c < connectionsList.length; c++) {
                if (a !== c && connectionsList[a].explicit[b] === connectionsList[c].base) {
                    for (var d = 0; d < connectionsList[c].explicit.length; d++) {
                        var shouldAdd = true;
                        for (var e = 0; e < connectionsList[a].explicit.length; e++) {
                            if (connectionsList[a].explicit[e] === connectionsList[c].explicit[d] || connectionsList[a].base === connectionsList[c].explicit[d]) {
                                shouldAdd = false;
                                break;
                            }   
                        }
                        if (shouldAdd) {
                            connectionsList[a].implicit.push(connectionsList[c].explicit[d]);
                        }
                    }
                }
            }
        }   
    }
    return connectionsList;
} // Probably useless. Will probably delete


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
};

G = 0;
var ang = 60;
ang = ang * Math.PI/180;
//createParticle(200, 300, 1, 0, 100);
//createParticle(300, 300, 0, 0, 100);
//createParticle(300 + 100*Math.cos(ang), 300-100*Math.sin(ang), -Math.cos(ang), Math.sin(ang), 100);
createParticle(100, 100, 1, 0, 100);
createParticle(200, 100, 0, 0, 100);
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
        list[i].listId = i;
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