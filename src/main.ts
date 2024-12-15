import { mat4, ReadonlyVec3, vec3 } from "gl-matrix";
import { up } from "./config";
import { cubeIndices, cubeVertices } from "./cube";
import { init } from "./gl";
import { createProgram, draw } from "./shader";
import { createTexture } from "./texture";
import { createVertexArray } from "./vertex-array";

// # setup canvas
const canvas = document.getElementById("screen") as HTMLCanvasElement;

// ## setup resize handler
let resizeTask: number = 0;
new ResizeObserver(([entry]) => {
  const [{ inlineSize, blockSize }] = entry.devicePixelContentBoxSize;
  const size = { width: inlineSize, height: blockSize };
  clearTimeout(resizeTask);
  resizeTask = setTimeout(() => {
    updateCameraMatrices(Object.assign(canvas, size));
  }, 150);
}).observe(canvas, { box: "content-box" });

// # create camera matrices
const projection = mat4.create();
const eye = vec3.fromValues(2, 2, 2);
const target = vec3.fromValues(0, 0, 0);
const view = mat4.lookAt(mat4.create(), eye, target, up);
const viewProjection = mat4.identity(mat4.create());
const invViewProj = mat4.identity(mat4.create());
let yfov = Math.PI / 4;

function updateCameraMatrices(target = canvas) {
  const aspectRatio = target.clientWidth / target.clientHeight;
  mat4.ortho(projection, -2 * aspectRatio, 2 * aspectRatio, -2, 2, 0, 4); // alternatively
  mat4.perspective(projection, yfov, aspectRatio, 0.01, +Infinity);
  mat4.multiply(viewProjection, projection, view);
  mat4.invert(invViewProj, viewProjection);
}

function raycastToPlane(
  out: vec3,
  P_0: ReadonlyVec3,
  V: ReadonlyVec3,
  N: ReadonlyVec3,
  d: number,
) {
  const t = -(vec3.dot(P_0, N) + d) / vec3.dot(V, N);
  return vec3.scaleAndAdd(out, P_0, V, t);
}

const N = vec3.create();
const V = vec3.create();
function toTargetPlaneFromCanvas(out: vec3, x: number, y: number) {
  out[0] = (x / canvas.clientWidth) * 2 - 1;
  out[1] = (-y / canvas.clientHeight) * 2 + 1;
  out[2] = -1;
  vec3.transformMat4(out, out, invViewProj);
  vec3.normalize(N, vec3.subtract(N, eye, target));
  vec3.normalize(V, vec3.subtract(V, out, eye));
  return raycastToPlane(out, out, V, N, vec3.dot(target, N));
}

function vector(out: vec3, a: ReadonlyVec3, b: ReadonlyVec3) {
  return vec3.normalize(out, vec3.sub(out, a, b));
}

// ## add camera control using mouse input from canvas
const position = vec3.create();
const tempVec3 = vec3.create();
const temp2Vec3 = vec3.create();
const delta = vec3.create();
const prev = vec3.create();
function onPointerEvent(event: PointerEvent) {
  if (!event.buttons || (!event.movementX && !event.movementY)) return;
  const { offsetX: x, offsetY: y } = event;
  toTargetPlaneFromCanvas(position, x, y);
  toTargetPlaneFromCanvas(prev, x - event.movementX, y - event.movementY);
  if (event.buttons & 1) {
    vec3.subtract(delta, position, prev);
    vec3.sub(eye, eye, delta);
  } else if (event.buttons & 2) {
    const v = vector(tempVec3, toTargetPlaneFromCanvas(tempVec3, 0, 0), eye);
    const a = Math.acos(vec3.dot(v, vector(temp2Vec3, position, eye)));
    const a_0 = Math.acos(vec3.dot(v, vector(temp2Vec3, prev, eye)));
    const t = a / a_0 || 1;
    yfov = Math.min(Math.max(Math.PI / 12, yfov * t), (Math.PI * 2) / 3);
  } else if (event.buttons & 4) {
    vec3.subtract(delta, position, prev);
    vec3.sub(target, target, delta);
    vec3.sub(eye, eye, delta);
  }

  mat4.lookAt(view, eye, target, up);
  updateCameraMatrices();
}

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", onPointerEvent);
canvas.addEventListener("pointermove", onPointerEvent);
canvas.addEventListener("pointerup", onPointerEvent);

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
  updateCameraMatrices();

  // ## clear screen
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // ## draw an object
  draw(gl, program, texture, viewProjection, vertexArray, cubeIndices.length);

  requestAnimationFrame(frame);
});

export {};
