import { mat4, vec3 } from "gl-matrix";
import { up } from "./config";
import { listenInputEvents } from "./input";
import { moveXY, pinchOrbit, rotateOrbit } from "./orbital";
import { cubeIndices, cubeVertices } from "./cube";
import { createProgram, draw } from "./shader";
import { createTexture } from "./texture";
import { init } from "./gl";
import { createVertexArray } from "./vertex-array";

// # create camera matrices
const projection = mat4.create();
const target = vec3.fromValues(0, 0, 0);
const view = mat4.lookAt(mat4.create(), [2, 2, 2], target, up);
const viewProjection = mat4.identity(mat4.create());

// # setup canvas
const canvas = document.getElementById("screen") as HTMLCanvasElement;

// ## setup resize handler
let resizeTask: number = 0;
new ResizeObserver(([entry]) => {
  const width = entry.devicePixelContentBoxSize[0].inlineSize;
  const height = entry.devicePixelContentBoxSize[0].blockSize;
  clearTimeout(resizeTask);
  resizeTask = setTimeout(() => {
    canvas.width = width;
    canvas.height = height;
  }, 150);
}).observe(canvas, { box: "content-box" });

// ## add camera control using mouse input from canvas
listenInputEvents(canvas, ({ keys, delta, buttons }) => {
  if ((keys.Space && keys.ShiftLeft) || buttons === 5) {
    rotateOrbit(view, target, delta);
  } else if ((keys.Space && keys.ControlLeft) || buttons === 6) {
    pinchOrbit(view, target, delta);
  } else if (keys.Space || buttons === 4) {
    moveXY(view, target, delta);
  }
});

// # initialize webgl2 rendering context
const gl = init(canvas);

// # prepare vertex array
const vertexArray = createVertexArray(gl, cubeVertices, cubeIndices);

// # prepare a texture
const texture = createTexture(gl);

// # create a shader program
const program = createProgram(gl);

// # for each frame
requestAnimationFrame(function frame() {
  // ## update camera materices
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;
  mat4.ortho(projection, -2 * aspectRatio, 2 * aspectRatio, -2, 2, 0, 4); // alternatively
  mat4.perspective(projection, Math.PI / 4, aspectRatio, 0.01, +Infinity);
  mat4.multiply(viewProjection, projection, view);

  // ## clear screen
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // ## draw an object
  draw(gl, program, texture, viewProjection, vertexArray, cubeIndices.length);

  requestAnimationFrame(frame);
});

export {};
