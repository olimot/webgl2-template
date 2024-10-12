import { mat4, ReadonlyVec3, vec3 } from "gl-matrix";
import { up } from "./config";

const eps = 1.01e-5;
const eye = vec3.create();
const dir = vec3.create();
const dp = vec3.create();

const deg = Math.PI / 180;
const matrix = mat4.create();
const tmpMat4 = mat4.create();

/** Camera Rotate; Camera translation and rotation using spherical coordinate system w/ target as origin */
export function rotateOrbit(view: mat4, target: vec3, delta: ReadonlyVec3) {
  mat4.getTranslation(eye, mat4.invert(matrix, view));
  const r = vec3.distance(eye, target);
  vec3.scale(dir, vec3.subtract(dir, eye, target), 1 / r);

  const theta = Math.atan2(dir[0], dir[2]) - delta[0];
  let phi = Math.acos(dir[1]) + delta[1];
  phi = Math.min(Math.max(eps, phi), 180 * deg - eps);
  const nDirx = Math.sin(phi) * Math.sin(theta);
  const nDirY = Math.cos(phi);
  const nDirZ = Math.sin(phi) * Math.cos(theta);

  vec3.add(eye, vec3.scale(eye, vec3.set(eye, nDirx, nDirY, nDirZ), r), target);
  mat4.lookAt(view, eye, target, up);
}

/** Camera Pinch; Camera translation using spherical coordinate system w/ target as origin */
export function pinchOrbit(view: mat4, target: vec3, delta: ReadonlyVec3) {
  mat4.getTranslation(eye, mat4.invert(matrix, view));
  const r = vec3.distance(eye, target);
  vec3.scale(dir, vec3.subtract(dir, eye, target), 1 / r);
  vec3.scale(eye, dir, Math.min(Math.max(eps, r + delta[0] * r), 1024));
  vec3.add(eye, eye, target);
  mat4.lookAt(view, eye, target, up);
}

/** Walk; Camera translation of z direction */
export function moveZ(view: mat4, target: vec3, delta: ReadonlyVec3) {
  mat4.getTranslation(eye, mat4.invert(matrix, view));
  const r = vec3.distance(eye, target);
  vec3.scale(dir, vec3.subtract(dir, eye, target), 1 / r);
  vec3.scale(dp, dir, Math.min(Math.max(eps, r + delta[0] * r), 1024));
  vec3.subtract(target, vec3.add(eye, target, dp), vec3.scale(dp, dir, r));
  mat4.lookAt(view, eye, target, up);
}

/** Grab; Camera translation of xy direction */
export function moveXY(view: mat4, target: vec3, delta: ReadonlyVec3) {
  mat4.getTranslation(eye, mat4.invert(matrix, view));

  vec3.scale(dp, delta, vec3.distance(eye, target));
  const tempMatrix = mat4.copy(tmpMat4, matrix);
  tempMatrix[12] = 0;
  tempMatrix[13] = 0;
  tempMatrix[14] = 0;
  vec3.transformMat4(dp, dp, tempMatrix);
  vec3.subtract(eye, eye, dp);
  vec3.subtract(target, target, dp);
  mat4.lookAt(view, eye, target, up);
}
