import { deflate, inflate } from 'pako';
import type { CalculatorInputs } from '@/engine';

export const SHARE_ENGINE_VERSION = '2.1';

export interface ShareSnapshot {
  v: string;
  i: CalculatorInputs;
  t: number;
}

function uint8ToBase64url(arr: Uint8Array): string {
  let binary = '';
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(arr[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToUint8(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

export function encodeShare(inputs: CalculatorInputs): string {
  const snapshot: ShareSnapshot = { v: SHARE_ENGINE_VERSION, i: inputs, t: Date.now() };
  const json = JSON.stringify(snapshot);
  const compressed = deflate(json, { level: 9 });
  return uint8ToBase64url(compressed);
}

export function decodeShare(encoded: string): ShareSnapshot {
  const bytes = base64urlToUint8(encoded);
  const json = inflate(bytes, { to: 'string' });
  return JSON.parse(json) as ShareSnapshot;
}
