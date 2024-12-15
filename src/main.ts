import { mat4, ReadonlyVec3, vec3 } from "gl-matrix";

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
const up: ReadonlyVec3 = vec3.fromValues(0, 1, 0);
const eye = vec3.fromValues(2, 2, 2);
const target = vec3.fromValues(0, 0, 0);
const view = mat4.lookAt(mat4.create(), eye, target, up);
const projection = mat4.create();
const viewProjection = mat4.identity(mat4.create());
const invViewProj = mat4.identity(mat4.create());
const near = 0.01;
const far = 1024;
const yfov = Math.PI / 4;

function updateCameraMatrices(target = canvas) {
  const aspectRatio = target.clientWidth / target.clientHeight;
  mat4.perspective(projection, yfov, aspectRatio, near, far);
  mat4.multiply(viewProjection, projection, view);
  mat4.invert(invViewProj, viewProjection);
}

// ## add camera control
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

const raycastToTargetPlane = (() => {
  const temp = vec3.create();
  const temp2 = vec3.create();
  const temp3 = vec3.create();
  return (out: vec3, x: number, y: number) => {
    temp[0] = (x / canvas.clientWidth) * 2 - 1;
    temp[1] = (-y / canvas.clientHeight) * 2 + 1;
    temp[2] = -1;
    const P_0 = vec3.transformMat4(temp, temp, invViewProj);
    const N = vec3.normalize(temp2, vec3.sub(temp2, eye, target));
    const V = vec3.normalize(temp3, vec3.sub(temp3, P_0, eye));
    const d = vec3.dot(target, N);
    return raycastToPlane(out, P_0, V, N, d);
  };
})();

const onPointerEvent = (() => {
  const temp = vec3.create();
  const temp2 = vec3.create();
  const temp3 = vec3.create();
  return (e: PointerEvent) => {
    if (!e.buttons || (!e.movementX && !e.movementY)) return;

    const { offsetX: x, offsetY: y, movementX: dX, movementY: dY } = e;

    if (e.buttons & 1) {
      const r = vec3.distance(eye, target);
      const targetToEye = vec3.normalize(temp, vec3.sub(temp, eye, target));
      const dTheta = -(dX / canvas.clientWidth) * 2;
      const dPhi = -(dY / canvas.clientHeight) * 2;
      const theta = Math.atan2(targetToEye[0], targetToEye[2]) + dTheta;
      let phi = Math.acos(targetToEye[1]) + dPhi;
      phi = Math.min(Math.max(0.001, phi), Math.PI - 0.001);
      targetToEye[0] = Math.sin(phi) * Math.sin(theta);
      targetToEye[1] = Math.cos(phi);
      targetToEye[2] = Math.sin(phi) * Math.cos(theta);
      vec3.scaleAndAdd(eye, target, targetToEye, r);
    } else if (e.buttons & 2) {
      const position = raycastToTargetPlane(temp, x, y);
      const prev = raycastToTargetPlane(temp2, x - dX, y - dY);
      const delta = vec3.subtract(temp3, position, prev);
      const rDelta = -Math.sign(dX || dY) * vec3.length(delta);
      const targetToEye = vec3.sub(temp3, eye, target);
      const r = vec3.length(targetToEye);
      vec3.scaleAndAdd(eye, target, targetToEye, (r + rDelta) / r);
    } else if (e.buttons & 4) {
      const position = raycastToTargetPlane(temp, x, y);
      const prev = raycastToTargetPlane(temp2, x - dX, y - dY);
      const delta = vec3.subtract(temp3, position, prev);
      vec3.sub(target, target, delta);
      vec3.sub(eye, eye, delta);
    }

    mat4.lookAt(view, eye, target, up);
    updateCameraMatrices();
  };
})();

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", onPointerEvent);
canvas.addEventListener("pointermove", onPointerEvent);
canvas.addEventListener("pointerup", onPointerEvent);

// # initialize webgl2 rendering context
const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
gl.depthFunc(gl.LEQUAL);
gl.blendFuncSeparate(
  gl.SRC_ALPHA,
  gl.ONE_MINUS_SRC_ALPHA,
  gl.ONE,
  gl.ONE_MINUS_SRC_ALPHA,
);
gl.blendEquation(gl.FUNC_ADD);
gl.colorMask(true, true, true, true);
gl.clearColor(31 / 255, 31 / 255, 31 / 255, 1);
gl.clearDepth(1);

// # prepare model data (this is a cube)
const vertices = new Float32Array([
  1, 1, -1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, -1, 1, 1, 0, 0, 0, 1, 1,
  -1, -1, 1, 0, 0, 1, 1, -1, 1, 1, -1, 0, 0, 1, 0, -1, 1, -1, -1, 0, 0, 0, 0,
  -1, -1, -1, -1, 0, 0, 0, 1, -1, -1, 1, -1, 0, 0, 1, 1, -1, 1, 1, 0, 1, 0, 1,
  0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, -1, 0, 1, 0, 0, 1, -1, 1, -1, 0, 1, 0, 1, 1,
  -1, -1, -1, 0, -1, 0, 1, 0, 1, -1, -1, 0, -1, 0, 0, 0, 1, -1, 1, 0, -1, 0, 0,
  1, -1, -1, 1, 0, -1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, -1, 1, 1, 0, 0, 1, 0, 0,
  -1, -1, 1, 0, 0, 1, 0, 1, 1, -1, 1, 0, 0, 1, 1, 1, -1, 1, -1, 0, 0, -1, 1, 0,
  1, 1, -1, 0, 0, -1, 0, 0, 1, -1, -1, 0, 0, -1, 0, 1, -1, -1, -1, 0, 0, -1, 1,
  1,
]);

const indices = new Uint8Array([
  0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14,
  15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
]);

// # prepare vertex array
const vertexArray = gl.createVertexArray();
gl.bindVertexArray(vertexArray);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
gl.enableVertexAttribArray(2);
gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
gl.bindVertexArray(null);

// # prepare a texture
const empty = new ImageData(1, 1);
empty.data.set([255, 255, 255, 255]);
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
const { TEXTURE_2D, TEXTURE_MIN_FILTER, LINEAR_MIPMAP_LINEAR } = gl;
gl.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, empty);

// # prepare shader sources
const vertexShaderSource = /* glsl */ `#version 300 es
uniform mat4 viewProjection;
in vec4 POSITION;
in vec3 NORMAL;
in vec2 TEXCOORD_0;
out vec3 vPosition;
out vec3 vNormal;
out vec2 vTexCoord;
void main() {
  vPosition = POSITION.xyz;
  vNormal = normalize(NORMAL);
  vTexCoord = TEXCOORD_0;
  gl_Position = viewProjection * POSITION;
}
`;

const fragmentShaderSource = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D baseColorTexture;
in vec3 vPosition;
in vec3 vNormal;
in vec2 vTexCoord;
out vec4 finalColor;
void main() {
  vec4 baseColor = texture(baseColorTexture, vTexCoord);
  vec3 normal;
  normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
  normal = vNormal;
  finalColor = baseColor * vec4((normal + 1.f) / 2.f, 1.f);
}
`;

// # create a shader program
// ## compile shaders
const vert = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
const frag = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
gl.shaderSource(vert, vertexShaderSource);
gl.shaderSource(frag, fragmentShaderSource);
gl.compileShader(vert);
gl.compileShader(frag);

// ## create a program
const program = gl.createProgram() as WebGLProgram;
gl.attachShader(program, vert);
gl.attachShader(program, frag);
gl.bindAttribLocation(program, 0, "POSITION");
gl.bindAttribLocation(program, 1, "NORMAL");
gl.bindAttribLocation(program, 2, "TEXCOORD_0");
gl.linkProgram(program);
const uLoc = {
  viewProjection: gl.getUniformLocation(program, "viewProjection"),
  baseColorTexture: gl.getUniformLocation(program, "baseColorTexture"),
};

// # for each frame
requestAnimationFrame(function frame() {
  // ## update camera materices
  updateCameraMatrices();

  // ## clear screen
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // ## draw an object
  // ### use program
  gl.useProgram(program);

  // ### set textures
  gl.activeTexture(gl.TEXTURE0 + 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // ### set uniforms
  gl.uniform1i(uLoc.baseColorTexture, 0);
  gl.uniformMatrix4fv(uLoc.viewProjection, false, viewProjection);

  // ### set global state
  gl.frontFace(gl.CCW);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  // ### bind vertex array and draw
  gl.bindVertexArray(vertexArray);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
  gl.bindVertexArray(null);

  requestAnimationFrame(frame);
});

export {};
