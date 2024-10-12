import { vec3 } from "gl-matrix";

export type InputState = {
  buttons: number;
  position: vec3;
  delta: vec3;
  keys: Record<string, boolean>;
  wheel: number;
};

export function listenInputEvents(
  canvas: HTMLCanvasElement,
  onChange: (state: InputState) => void,
) {
  const state: InputState = {
    buttons: 0,
    position: vec3.create(),
    delta: vec3.create(),
    keys: {},
    wheel: 0,
  };

  const isMac = navigator.userAgent.includes("Mac");

  window.addEventListener("keydown", (e) => {
    let { code } = e;
    if (isMac) code = code.replace(/^Alt/, "Control");
    state.keys[code] = true;
    onChange(state);
  });

  window.addEventListener("keyup", (e) => {
    let { code } = e;
    if (isMac) code = code.replace(/^Alt/, "Control");
    delete state.keys[code];
    onChange(state);
  });

  const detectMouseChange = (e: {
    offsetX: number;
    offsetY: number;
    movementX: number;
    movementY: number;
    buttons?: number;
  }) => {
    state.buttons = e.buttons || 0;
    state.delta[0] = (e.movementX / canvas.offsetWidth) * 2;
    state.delta[1] = -(e.movementY / canvas.offsetHeight) * 2;
    state.position[0] = (e.offsetX / canvas.offsetWidth) * 2 - 1;
    state.position[1] = 1 - (e.offsetY / canvas.offsetHeight) * 2;
    onChange(state);
  };

  canvas.addEventListener("mousedown", detectMouseChange);
  canvas.addEventListener("mouseenter", detectMouseChange);
  canvas.addEventListener("mousemove", detectMouseChange);
  canvas.addEventListener("mouseup", detectMouseChange);
  canvas.addEventListener("mouseleave", detectMouseChange);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener(
    "wheel",
    ((e: WheelEvent & { wheelDelta: number }) => {
      if (e.ctrlKey) e.preventDefault();
      let wheel;
      if (e.wheelDelta === e.deltaY * -3) {
        wheel = (e.deltaY / canvas.offsetHeight) * 2;
      } else {
        wheel = e.wheelDelta / window.devicePixelRatio / window.screen.height;
      }
      state.wheel = state.wheel + wheel;
      onChange(state);
    }) as EventListenerOrEventListenerObject,
    { passive: false },
  );

  return state;
}
