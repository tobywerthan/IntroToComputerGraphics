/**
 * Lab 2 - COMP3801 Spring 2023
 *   Basic WebGL2 shaders, mouse events and coordinates
 */

"use strict";

// Constructor
//
// @param canvasID - string containing name of canvas to render.
//          Buttons and sliders should be prefixed with this string.
//
function Lab2(canvasID) {
    this.canvasID = canvasID;
    this.canvas = document.getElementById(canvasID);
    if (!this.canvas) {
        alert("Canvas ID '" + canvasID + "' not found.");
        return;
    }
    this.gl = WebGLUtils.setupWebGL(this.canvas);
    if (!this.gl) {
        alert("WebGL isn't available in this browser");
        return;
    }

    this.init();
}

// Define prototype values common to all Lab2 objects
Lab2.prototype.gl = null;

Lab2.prototype.toString = function () {
    return JSON.stringify(this);
};

Lab2.prototype.init = function () {
    var canvas = this.canvas;
    var gl = this.gl;
    var t = this;  // make available to event handlers
    var pointArray = [];

    // WebGL setup
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Compile and link shaders
    this.shaderProgram = initShaders(gl, "vShader.glsl", "fShader.glsl");
    if (this.shaderProgram === null)
        return;
    gl.useProgram(this.shaderProgram);

    // Define names for colors
    var white = vec3(1.0, 1.0, 1.0);
    var red = vec3(1.0, 0.0, 0.0);
    var green = vec3(0.0, 1.0, 0.0);
    var blue = vec3(0.0, 0.0, 1.0);
    var yellow = vec3(1.0, 1.0, 0.0);

    // Array of alternating initial vertex coordinates and colors for each vertex
    this.vertexData = [];

    // Count of points in vertexData
    this.pointCount = 0;

    var floatSize = 4;  // size of gl.FLOAT in bytes
    // Load vertex data into WebGL buffer
    this.vertexCoordBuffer = gl.createBuffer();  // get unique buffer ID
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexCoordBuffer);  // make this the active buffer

    // Define data layout in buffer for position.  Postions are 3 floats,
    // interleaved with 3 floats for colors, starting at beginning of buffer.
    this.vPosition = gl.getAttribLocation(this.shaderProgram, "vPosition");
    gl.vertexAttribPointer(this.vPosition, 3, gl.FLOAT, false, 6 * floatSize, 0);
    gl.enableVertexAttribArray(this.vPosition);

    // Define data layout in buffer for colors.  Colors are 3 floats,
    // interleaved with 3 floats for positions, starting after first position in buffer.
    this.vColor = gl.getAttribLocation(this.shaderProgram, "vColor");
    gl.vertexAttribPointer(this.vColor, 3, gl.FLOAT, false, 6 * floatSize, 3 * floatSize);
    gl.enableVertexAttribArray(this.vColor);

    // Define callback for change of slider value
    var sliderCallback = function (e) {
        // Update text display for slider
        var color = e.target.value;
        e.target.valueDisplay.textContent = color;
        var hex = "#";
        var colorValues= [];
        for (var i in this.colors) {
            var color = this.colors[i];
            var colorValue = this.rgbSliders[color].valueAsNumber;
            colorValues[i] = colorValue;
        }
        hex += valueToHex(Math.floor(this.rgbSliders['r'].value*255));
        hex += valueToHex(Math.floor(this.rgbSliders['g'].value*255));
        hex += valueToHex(Math.floor(this.rgbSliders['b'].value*255));
        document.body.style.setProperty('--display-bg-color', hex);
        console.log(hex);
        // Re-render canvas
        requestAnimationFrame(render);
    }.bind(this);

    // Set up HTML user interface
    this.colors = ["r", "g", "b"];
    var rgbSliders = [];         // array of slider HTML elements
    var rgbSliderValues = [];    // array of slider value HTML elements

    this.rgbSliders = createSliders(rgbSliders, this.colors, this.canvasID, rgbSliderValues, sliderCallback);

    var resetButton = document.getElementById(this.canvasID + "-reset-button");
    if (resetButton === null) {
        alert("Reset button ID not found: " + this.canvasID + "-reset-button");
        return;
    }

    // Set up callback to render a frame
    var render = function () {
        t.Render();
    };

    // Set up the callback for the reset button
    resetButton.addEventListener("click", function () {
        // Reset all the sliders to the middle value
        for (var i in rgbSliders) {
            rgbSliders[i].value = rgbSliders[i].max / 2.0;
            rgbSliders[i].valueDisplay.textContent =
                    rgbSliders[i].valueAsNumber / rgbSliders[i].max;
        }
        this.vertexData = [];
        this.pointCount = 0;
        document.body.style.setProperty('--display-bg-color', "#7f7f7f");
        requestAnimationFrame(render);
    }.bind(this));

    // Set up mouse tracking
    var mouseX = document.getElementById(this.canvasID + "-mousex");
    var mouseY = document.getElementById(this.canvasID + "-mousey");
    var mouseXClipped = document.getElementById(this.canvasID + "-mousex-clipped");
    var mouseYClipped = document.getElementById(this.canvasID + "-mousey-clipped");
    var mouseButtonDown = document.getElementById(this.canvasID + "-mousedown");
    var mouseButtonUp = document.getElementById(this.canvasID + "-mouseup");
    this.mouseDown = false;  // track mouse button state
    this.mouseUp = true;
    mouseButtonDown.textContent = this.mouseDown;
    mouseButtonUp.textContent = this.mouseUp;
    if (mouseX === null || mouseY === null || mouseButtonDown === null || mouseButtonUp === null) {
        alert("Mouse output HTML IDs not found");
        return;
    }

    // Add mouse event handlers
    canvas.addEventListener("mousedown", function (e) {
        t.mouseDown = true;
        t.mouseUp = false;
        mouseButtonDown.textContent = t.mouseDown;
        mouseButtonUp.textContent = t.mouseUp;
    });
    canvas.addEventListener("mouseup", function (e) {
        t.mouseDown = false;
        t.mouseUp = true;
        mouseButtonUp.textContent = t.mouseUp;
        mouseButtonDown.textContent = t.mouseDown;
        this.vertexData = this.vertexData.concat(clippedVec(e, canvas, this.rgbSliders));
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.vertexData), this.gl.STATIC_DRAW);
        this.pointCount = this.pointCount + 1;
        requestAnimationFrame(render);
    }.bind(this));
    canvas.addEventListener("mousemove", function (e) {
        var tempX = (e.pageX - e.target.offsetLeft) - canvas.width / 2;
        mouseXClipped.textContent = clippedX(tempX, canvas);
        var tempY = ((e.pageY - e.target.offsetTop) - canvas.height / 2) * -1;
        mouseYClipped.textContent = clippedY(tempY, canvas);
        mouseY.textContent = (e.pageY - e.target.offsetTop);
        mouseX.textContent = (e.pageX - e.target.offsetLeft);
    });
    requestAnimationFrame(render);
};

/**
 * GetSliderColors - get the current RGB color represented by the sliders
 *   as a vec3.
 *   
 * @returns {vec3} current slider color
 */
Lab2.prototype.getSliderColor = function () {
    // Build an array of color values based on the current slider colors
    var colorValues = [];
    for (var i in this.colors) {
        var color = this.colors[i];
        var colorValue = this.rgbSliders[color].valueAsNumber;
        colorValues[i] = colorValue;
    }
};

/**
 * Render - draw the frame
 *
 */
Lab2.prototype.Render = function () {
    var gl = this.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    determineTool(gl, this.canvasID, this.pointCount, this.vertexData);
};

/**
 * valueToHex - returns 
 * @param {type} c - array of integers representing rgb values
 * @returns {valueToHex.hex|String} rgb values converted to hex string 
 */
function valueToHex(c) {
    var hex = c.toString(16);
    if(hex.length < 2){
        hex = "0" + hex;
    }
    return hex;
}

/**
 * determineTool - determines how web gl draws each vertex
 * @param {type} gl - instance of gl
 * @param {type} id - the canvas ID
 * @param {type} pc - the current point count
 * @param {type} vd - the current vertex data
 * @returns void
 */
function determineTool(gl, id, pc, vd) {
    if (document.getElementById(id + "-points").checked) {
        gl.drawArrays(gl.POINTS, 0,  pc);
    } else if (document.getElementById(id + "-lines").checked) {
        gl.drawArrays(gl.POINTS, 0,  pc);
        gl.drawArrays(gl.LINES, 0,  pc);
    } else if (document.getElementById(id + "-line-strips").checked) {
        gl.drawArrays(gl.POINTS, 0,  pc);
        gl.drawArrays(gl.LINE_STRIP, 0,  pc);
    } else if (document.getElementById(id + "-triangles").checked) {
        gl.drawArrays(gl.POINTS, 0,  pc);
        gl.drawArrays(gl.TRIANGLES, 0,  pc);
    } else if (document.getElementById(id + "-triangle-strips").checked) {
        gl.drawArrays(gl.POINTS, 0,  pc);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, pc);
    } else if (document.getElementById(id + "-triangle-fan").checked) {
        gl.drawArrays(gl.POINTS, 0,  pc);
        gl.drawArrays(gl.TRIANGLE_FAN, 0,  pc);
    } else if (document.getElementById(id + "-line-loops").checked) {
        gl.drawArrays(gl.POINTS, 0,  pc);
        gl.drawArrays(gl.LINE_LOOP, 0, pc);
    } else {
        newPointVec = [];
        vd = vd.concat(newPointVec);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vd), gl.STATIC_DRAW);
    }    
}

/**
 * clippedVec - calculates the clipped coordinates given html coordinates
 * @param {type} e - element
 * @param {type} c - canvas
 * @param {type} slider - this.rgbSliders
 * @returns {Array} - new point vector 
 */
function clippedVec(e, c, slider) {
    var newPointVec = [];
    var pixelClippedY = ((e.pageY - e.target.offsetTop) - c.height / 2) * -1;
    var pixelClippedX = (e.pageX - e.target.offsetLeft) - c.width / 2;
    var normalizedX = clippedX(pixelClippedX, c);
    var normalizedY = clippedY(pixelClippedY, c);
    var colorVec = vec3(slider['r'].value, slider['g'].value, slider['b'].value);
    newPointVec = [vec3(normalizedX, normalizedY, 0.0), colorVec];
    return newPointVec;
}

/**
 * clippedX - calculates the clipped X coordinate given the offset html coordinates
 * @param {type} x - offset html coordinate
 * @param {type} c - canvas
 * @returns {Number} - clipped X value
 */
function clippedX(x, c) {
    return 2 * ((x) / (c.width)).toFixed(3);
}

/**
 * clippedY - calculates the clipped Y coordinate given the offset html coordinates
 * @param {type} y - offset html coordinate
 * @param {type} c - canvas
 * @returns {Number} - clipped Y value
 */
function clippedY(y, c){
    return 2 * ((y) / (c.height)).toFixed(3);
}

/**
 * createSliders - creates an object that stores an array of sliders accessed by 'r', 'g', 'b'
 * @param {type} sliders - rgbSliders
 * @param {type} c - colors
 * @param {type} id - canvasID
 * @param {type} sliderVals - rgbSliderValues
 * @param {type} sb - SliderCallback
 * @returns sliders - object that stores an array of sliders
 */
function createSliders(sliders, c, id, sliderVals, sb){
    for (var i in c) {
        var color = c[i];
        var sliderID = id + "-" + color + "-slider";
        sliders[color] = document.getElementById(sliderID);
        if (sliders[color] === null) {
            alert("Slider ID not found: " + sliderID);
            return;
        }
        var valueID = id + "-" + color + "-value";
        sliderVals[color] = document.getElementById(valueID);
        if (sliders[color] === null) {
            alert("Slider value ID not found: " + sliderID);
            return;
        }
        sliders[color].valueDisplay = sliderVals[color];  // attach to slider

        // Set callback on slider input
        sliders[color].addEventListener("input", sb);
    }
    return sliders;
}