import { TextEncoder } from "node:util"

const nodeBytes = new TextEncoder().encode("")

Object.defineProperty(globalThis, "Uint8Array", {
  value: nodeBytes.constructor,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, "ArrayBuffer", {
  value: nodeBytes.buffer.constructor,
  writable: true,
  configurable: true,
})
