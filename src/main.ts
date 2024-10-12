import { mat4, vec3 } from "gl-matrix";
import { up } from "./config";
import { listenInputEvents } from "./input";
import { moveXY, pinchOrbit, rotateOrbit } from "./orbital";

// # create cube vertices
const faceIndicesMap = [
  [3, 7, 5, 1],
  [6, 2, 0, 4],
  [6, 7, 3, 2],
  [0, 1, 5, 4],
  [7, 6, 4, 5],
  [2, 3, 1, 0],
];
const cornerVertices = [
  [-0.5, -0.5, -0.5],
  [+0.5, -0.5, -0.5],
  [-0.5, +0.5, -0.5],
  [+0.5, +0.5, -0.5],
  [-0.5, -0.5, +0.5],
  [+0.5, -0.5, +0.5],
  [-0.5, +0.5, +0.5],
  [+0.5, +0.5, +0.5],
];
const faceNormals = [
  [+1, +0, +0],
  [-1, +0, +0],
  [+0, +1, +0],
  [+0, -1, +0],
  [+0, +0, +1],
  [+0, +0, -1],
];
const uvCoords = [
  [1, 0],
  [0, 0],
  [0, 1],
  [1, 1],
];
const nFaces = 6;
const count = nFaces * 4;
const interleave = new Float32Array(8 * count);
const indices = new Uint8Array(nFaces * 6);
let vertexCursor = 0;
let indexCursor = 0;
for (let f = 0; f < 6; ++f) {
  const faceIndices = faceIndicesMap[f];
  for (let v = 0; v < 4; ++v) {
    interleave.set(cornerVertices[faceIndices[v]], vertexCursor * 8);
    interleave.set(faceNormals[f], vertexCursor * 8 + 3);
    interleave.set(uvCoords[v], vertexCursor * 8 + 6);
    vertexCursor++;
  }
  [0, 1, 2, 0, 2, 3].forEach((i) => {
    indices[indexCursor++] = 4 * f + i;
  });
}

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

// # prepare vertex array
const vertexArray = gl.createVertexArray();
gl.bindVertexArray(vertexArray);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, interleave, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
gl.enableVertexAttribArray(2);
gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
gl.bindVertexArray(null);

// # prepare texture
const empty = new ImageData(1, 1);
empty.data.set([255, 255, 255, 255]);
const texture = gl.createTexture();
const texUnit = 0;
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, empty);

// # create program
const vert = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
const frag = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
gl.shaderSource(
  vert,
  /* glsl */ `#version 300 es
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
`,
);
gl.shaderSource(
  frag,
  /* glsl */ `#version 300 es
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
`,
);
gl.compileShader(vert);
gl.compileShader(frag);
const program = gl.createProgram() as WebGLProgram;
gl.attachShader(program, vert);
gl.attachShader(program, frag);
gl.bindAttribLocation(program, 0, "POSITION");
gl.bindAttribLocation(program, 1, "NORMAL");
gl.bindAttribLocation(program, 2, "TEXCOORD_0");
gl.linkProgram(program);
console.log(gl.getShaderInfoLog(vert));
console.log(gl.getShaderInfoLog(frag));

// # get uniform locations
gl.useProgram(program);
const baseColorTextureLoc = gl.getUniformLocation(program, "baseColorTexture");
const viewProjectionLoc = gl.getUniformLocation(program, "viewProjection");

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

  // ## draw
  gl.useProgram(program);

  // ### set textures
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // ### set uniforms
  gl.uniform1i(baseColorTextureLoc, texUnit);
  gl.uniformMatrix4fv(viewProjectionLoc, false, viewProjection);

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
