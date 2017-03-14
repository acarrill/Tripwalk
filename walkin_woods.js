// PerspectiveView_mvpMatrix.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

var camera;
var treePosition = [];
var soundtrack;

function startGL() {
    //Creamos Interfaz para la cámara y le añadimos dos handlers para el teclado
    camera = new ViewControl();
    soundtrack = new Sound("bso_extended.mp3");
    soundtrack.play();
    camera.keyHandlerChangeView = function(event) {
        switch(event.key) {
            case "ArrowUp":
                camera.speed = 0.5;
                camera.move(camera.speed);
                break;
            case "ArrowDown":
                camera.speed = -0.5;
                camera.move(camera.speed);
                break;
            case "ArrowLeft":
                camera.moveAngle = -1;
                camera.rote(camera.moveAngle);
                break;
            case "ArrowRight":
                camera.moveAngle = 1;
                camera.rote(camera.moveAngle);
                break;
            default:
                console.log("Key not handled");
        }
    }

    document.addEventListener("keydown", camera.keyHandlerChangeView, false);

    initMap();
    //Obtenemos la función de renderizado del bosque como return del main
    var renderLoop = main();
    camera.updateForest = setInterval(renderLoop, 17);
}

function initMap() {
    //Crea posiciones aleatorias para los árboles; también escalado aleatorio
    for (var i=0; i <400; i++){
        var x = Math.floor(Math.random() * 100);
        var y = Math.floor((Math.random() * 100) - 50);
        var z = Math.floor((Math.random() * 5) + 3.5)
        treePosition.push(x);
        treePosition.push(y);
        treePosition.push(z);
    }
}

function ViewControl() {
    //Interfaz de parámetros y método que usaremos para crear y controlar la camara/vista
    this.angle = 0.0;
    this.moveAngle = 0.0;
    this.y = 0.0;
    this.x = 0.0;
    this.vectorY = 0;
    this.vectorX = 0;
    this.speed = 0.5;
    this.left = 0;
    this.right = 0;
    this.move = function(speed) {
        this.speed = speed;
        this.x += this.speed * Math.cos(this.angle);
        this.y -= this.speed * Math.sin(this.angle);
    }
    this.rote = function(moveAngle) {
        this.angle += this.moveAngle * Math.PI / 180;
        this.vectorX = Math.cos(-this.angle);
        this.vectorY = Math.sin(-this.angle);
    }
}

function main() {
    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    gl.enable(gl.DEPTH_TEST);

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Set the vertex coordinates and color (the blue triangle is in the front)
    var n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to set the vertex information');
        return;
    }

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // Get the storage location of u_MvpMatrix
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    if (!u_MvpMatrix) {
        console.log('Failed to get the storage location of u_MvpMatrix');
        return;
    }

    var modelMatrix = new Matrix4(); // Model matrix
    var viewMatrix = new Matrix4();  // View matrix
    var projMatrix = new Matrix4();  // Projection matrix
    var mvpMatrix = new Matrix4();   // Model view projection matrix

    // Initialize the model, view and projection matrices
    modelMatrix.setTranslate(1, -0.75, 0);
    viewMatrix.setLookAt(camera.x, camera.y, 1.90, camera.x + camera.vectorX, camera.y + camera.vectorY, 1.90, 0, 0, 1);
    projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
    // Calculate the model view projection matrix
    mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    // Pass the model view projection matrix to u_MvpMatrix
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

　   // Creamos la función que llamaremos para actualizar constantemente el bosque
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);   // Clear <canvas>
        viewMatrix.setLookAt(camera.x, camera.y, 1.90, camera.x + camera.vectorX, camera.y + camera.vectorY, 1.90, 0, 0, 1);
        var len = treePosition.length;
        for (var i=0; i <1200; i+=3){
            var x = treePosition[i];
            var y = treePosition[i+1];
            var z = treePosition[i+2];
            modelMatrix.setTranslate(x , y, 0);
            modelMatrix.rotate(0, 35 + i, 1, 0);
            modelMatrix.scale(1, 1, z);
            // Calculate the model view projection matrix
            mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
            // Pass the model view projection matrix to u_MvpMatrix
            gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
            gl.drawArrays(gl.TRIANGLES, 0, n);   // Draw the triangles
        }
    }
    //Devolvemos la función, nuestras variables privadas sobre el contexto seran accesibles desde fuera
    return render;
}

//Constructor de sonidos
function Sound(src) {
    this.Sound = document.createElement("audio");
    this.Sound.src = src;
    this.Sound.setAttribute("preload", "auto");
    this.Sound.setAttribute("controls", "none");
    this.Sound.setAttribute("loop", "loop");
    this.Sound.style.display = "none";
    document.body.appendChild(this.Sound);
    this.play = function(){
        this.Sound.play();
    }
    this.stop = function(){
        this.Sound.pause();
    }
}

function initVertexBuffers(gl) {
  var verticesColors = new Float32Array([
    // Vertex coordinates and color
     0.0,  0.0,   1.0,  0.9,  0.0,  0.5, // The back green one
     0.5,  0.0,   0.0,  0.5,  0.3,  0.7,
    -0.5,  0.0,  0.0,  0.5,  0.0,  0.7,

     0.0,  0.0,   1.0,   0.9,  0.0,  0.5,  // The front blue one
     0.0,  0.5,   0.0,   0.5,  0.3,  0.7,
     0.0, -0.5,   0.0,   0.5,  0.0,  0.7,
  ]);
  var n = 6;

  // Create a buffer object
  var vertexColorBuffer = gl.createBuffer();
  if (!vertexColorBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Write the vertex information and enable it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);

  return n;
}
