import { mat4 } from "gl-matrix";

export function createProgram(gl: WebGL2RenderingContext) {
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
  return program;
}

let memoUniformLocations: Record<string, WebGLUniformLocation> | null = null;
export function getUniformLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
) {
  return (memoUniformLocations ??= {
    viewProjection: gl.getUniformLocation(program, "viewProjection")!,
    baseColorTexture: gl.getUniformLocation(program, "baseColorTexture")!,
  });
}

export function draw(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  texture: WebGLTexture | null,
  viewProjection: mat4,
  vertexArray: WebGLVertexArrayObject | null,
  elementCount: number,
) {
  // ## draw
  gl.useProgram(program);

  // ### set textures
  gl.activeTexture(gl.TEXTURE0 + 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // ### set uniforms
  const loc = getUniformLocations(gl, program);
  gl.uniform1i(loc.baseColorTexture, 0);
  gl.uniformMatrix4fv(loc.viewProjection, false, viewProjection);

  // ### set global state
  gl.frontFace(gl.CCW);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  // ### bind vertex array and draw
  gl.bindVertexArray(vertexArray);
  gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_BYTE, 0);
  gl.bindVertexArray(null);
}
