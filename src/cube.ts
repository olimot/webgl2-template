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
  [-1, -1, -1],
  [+1, -1, -1],
  [-1, +1, -1],
  [+1, +1, -1],
  [-1, -1, +1],
  [+1, -1, +1],
  [-1, +1, +1],
  [+1, +1, +1],
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
const vertexCount = nFaces * 4;
export const cubeVertices = new Float32Array(8 * vertexCount);
export const cubeIndices = new Uint8Array(nFaces * 6);
let vertexCursor = 0;
let indexCursor = 0;
for (let f = 0; f < 6; ++f) {
  const faceIndices = faceIndicesMap[f];
  for (let v = 0; v < 4; ++v) {
    cubeVertices.set(cornerVertices[faceIndices[v]], vertexCursor * 8);
    cubeVertices.set(faceNormals[f], vertexCursor * 8 + 3);
    cubeVertices.set(uvCoords[v], vertexCursor * 8 + 6);
    vertexCursor++;
  }
  [0, 1, 2, 0, 2, 3].forEach((i) => {
    cubeIndices[indexCursor++] = 4 * f + i;
  });
}

export function createCubeVertices(width = 1, height = 1, depth = 1) {
  const newVertices = new Float32Array(cubeVertices);
  for (let i = 0; i < vertexCount; i++) {
    newVertices[i * 8 + 0] *= width;
    newVertices[i * 8 + 1] *= height;
    newVertices[i * 8 + 2] *= depth;
  }
  return newVertices;
}
