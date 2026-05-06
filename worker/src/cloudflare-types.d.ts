/**
 * Cloudflare Workers runtime type stubs (subset, v2 compat).
 *
 * Provides TypeScript type definitions for the Cloudflare Workers runtime
 * environment used by worker/src/index.ts. Covers the subset of the runtime
 * actually used in this project: D1 database, KV namespace, Durable Objects,
 * fetch/Request/Response, Streams, Crypto, and ExecutionContext.
 *
 * These stubs enable type-checking without requiring the full
 * @cloudflare/workers-types package. They are compatible with the
 * Cloudflare Workers v2 runtime API surface.
 *
 * Note: The actual Cloudflare runtime binds these objects (D1Database,
 * KVNamespace, etc.) at the outer worker entry point (the ExportedHandler).
 * This file only provides TypeScript declarations so the compiler can resolve
 * the types. The worker code uses them via the `Env` generic parameter and
 * the `ctx` ExecutionContext.
 *
 * Referenced in: worker/src/index.ts (CONFIG_KV: KVNamespace, PIPELINE_DB: D1Database)
 */

// ── Align all @cloudflare/workers-types D1 types with the local stubs.
// ── This module augmentation ensures that code importing from
// ── '@cloudflare/workers-types' gets the same D1Database/D1Result shapes
// ── used throughout the codebase (which differ from the upstream types
// ── in the `withSession`/`dump` presence and the `success: boolean` field).
declare module '@cloudflare/workers-types' {
  // D1Database
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1Result>;
    batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
    withSession(sessionId: string): D1Database;
    dump(): Promise<unknown>;
  }
  // D1PreparedStatement
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    run(): Promise<D1Result>;
    first<T = Record<string, unknown>>(): Promise<T | null>;
    all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
    raw<T = Record<string, unknown>>(): Promise<T[]>;
  }
  // D1Result
  interface D1Result<T = Record<string, unknown>> {
    results: T[];
    success: boolean;
    meta: {
      changes?: number;
      last_row_id?: number;
      rows_read?: number;
      rows_written?: number;
      statement?: string;
    };
  }
  // KVNamespace — overloads to accept `{ type: 'json' }` as second param (object form)
  interface KVNamespace<Key extends string = string> {
    get(key: Key): Promise<string | null>;
    get(key: Key, type: 'text'): Promise<string | null>;
    get<ExpectedValue = unknown>(key: Key, type: 'json'): Promise<ExpectedValue | null>;
    get(key: Key, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
    get(key: Key, type: 'stream'): Promise<ReadableStream | null>;
    // Generic object options form (for dynamic `type` variables typed as `string`)
    get<ExpectedValue = unknown>(key: Key, options: { type: 'json' }): Promise<ExpectedValue | null>;
    get<ExpectedValue = unknown>(key: Key, options: { type: 'json'; cacheTtl?: number }): Promise<ExpectedValue | null>;
    put(key: Key, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; expiration?: number }): Promise<void>;
    delete(key: Key): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: Array<{ name: string; expiration?: number }>; list_complete: boolean; cursor?: string }>;
  }
}

// Cloudflare Workers runtime type stubs
declare class D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  withSession(sessionId: string): D1Database;
  dump(): Promise<unknown>;
}
declare class D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = Record<string, unknown>>(): Promise<T[]>;
}
declare interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: {
    changes?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
    statement?: string;
  };
}
declare interface KVNamespace<Key extends string = string> {
  get(key: Key): Promise<string | null>;
  get(key: Key, type: 'text'): Promise<string | null>;
  get<ExpectedValue = unknown>(key: Key, type: 'json'): Promise<ExpectedValue | null>;
  get(key: Key, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: Key, type: 'stream'): Promise<ReadableStream | null>;
  // Object form for runtime-typed `type` argument (e.g. Wrangler or complex logic)
  get<ExpectedValue = unknown>(key: Key, options: { type: 'json' }): Promise<ExpectedValue | null>;
  get<ExpectedValue = unknown>(key: Key, options: { type: 'json'; cacheTtl?: number }): Promise<ExpectedValue | null>;
  put(key: Key, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; expiration?: number }): Promise<void>;
  delete(key: Key): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<KVNamespaceListResult>;
}
declare var KVNamespace: {
  new <Key extends string = string>(): KVNamespace<Key>;
};
declare class Blob {
  constructor(parts?: BlobPart[], options?: BlobPropertyBag);
  readonly size: number;
  readonly type: string;
  slice(start?: number, end?: number, contentType?: string): Blob;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  stream(): ReadableStream<Uint8Array>;
}
declare type BlobPart = BufferSource | Blob | string;
declare interface BlobPropertyBag {
  type?: string;
  endings?: 'transparent' | 'native';
}
declare interface KVNamespaceListResult {
  keys: Array<{ name: string; expiration?: number }>;
  list_complete: boolean;
  cursor?: string;
}
declare function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
declare class FormData {
  append(name: string, value: string): void;
  append(name: string, value: Blob, filename?: string): void;
  delete(name: string): void;
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
  has(name: string): boolean;
  set(name: string, value: string): void;
  set(name: string, value: Blob, filename?: string): void;
  forEach(fn: (value: FormDataEntryValue, key: string) => void): void;
  entries(): IterableIterator<[string, FormDataEntryValue]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<FormDataEntryValue>;
}
declare type FormDataEntryValue = File | string;
declare class Request {
  constructor(input: RequestInfo, init?: RequestInit);
  readonly method: string;
  readonly url: string;
  readonly headers: Headers;
  readonly body?: ReadableStream<Uint8Array>;
  readonly bodyUsed: boolean;
  json<T>(): Promise<T>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  formData(): Promise<FormData>;
}
declare class Response {
  constructor(body?: BodyInit | null, init?: ResponseInit);
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly body?: ReadableStream<Uint8Array> | null;
  json<T>(): Promise<T>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  static error(): Response;
  static json(data: unknown, init?: ResponseInit): Response;
  static redirect(url: string, status?: number): Response;
}
declare class Headers {
  constructor(init?: HeadersInit);
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  entries(): IterableIterator<[string, string]>;
  forEach(fn: (value: string, key: string) => void): void;
}
declare type HeadersInit = Record<string, string> | [string, string][] | Headers;
declare class URL {
  constructor(url: string, base?: string);
  readonly protocol: string;
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
  readonly searchParams: URLSearchParams;
  readonly origin: string;
  href: string;
  toString(): string;
}
declare class URLSearchParams {
  constructor(init?: string | Record<string, string> | [string, string][] | URLSearchParams);
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(fn: (value: string, key: string) => void): void;
  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  toString(): string;
}
declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  table(data: unknown): void;
  time(label: string): void;
  timeEnd(label: string): void;
  timeLog(label: string): void;
  group(...label: unknown[]): void;
  groupEnd(): void;
  groupCollapsed(...label: unknown[]): void;
};
declare function setTimeout(callback: (value: unknown) => void, ms: number): number;
declare function clearTimeout(id: number): void;
declare function atob(encoded: string): string;
declare function btoa(str: string): string;
declare interface Crypto {
  randomUUID(): string;
  getRandomValues<T extends Uint8Array>(array: T): T;
  subtle: SubtleCrypto;
}
declare interface SubtleCrypto {
  sign(algorithm: string | { name: string; hash?: string }, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
  verify(algorithm: string | { name: string; hash?: string }, key: CryptoKey, signature: BufferSource, data: BufferSource): Promise<boolean>;
  importKey(format: string, keyData: BufferSource, algorithm: string | object, extractable: boolean, keyUsages: string[]): Promise<CryptoKey>;
  digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>;
  encrypt(algorithm: string | object, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
  decrypt(algorithm: string | object, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
}
declare interface CryptoKey {}
declare const crypto: Crypto;
declare var self: WindowOrWorkerGlobalScope & typeof globalThis;
declare class TransformStream<T = unknown, U = unknown> {
  readonly readable: ReadableStream<T>;
  readonly writable: WritableStream<U>;
  constructor();
}
declare class TextEncoder {
  constructor();
  encode(input?: string): Uint8Array;
}
declare class TextDecoder {
  constructor(encoding?: string);
  decode(input?: Uint8Array | ArrayBuffer, options?: { stream?: boolean }): string;
}
declare const performance: {
  now(): number;
};
declare class ReadableStream<T = unknown> {
  constructor();
  getReader(): ReadableStreamDefaultReader<T>;
  cancel(reason?: unknown): Promise<void>;
}
declare class ReadableStreamDefaultReader<T = unknown> {
  read(): Promise<{ done: boolean; value: T }>;
  releaseLock(): void;
}
declare class WritableStream<T = unknown> {
  constructor();
  getWriter(): WritableStreamDefaultWriter<T>;
}
declare interface WritableStreamDefaultWriter<T = unknown> {
  write(chunk: T): Promise<void>;
  releaseLock(): void;
  close(): Promise<void>;
}
declare const structuredClone: {
  <T>(value: T, options?: { transfer?: unknown[] }): T;
};
declare const AbortSignal: {
  abort(): AbortSignal;
  timeout(ms: number): AbortSignal;
};
declare interface AbortSignal {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener(type: 'abort', listener: (event: unknown) => void): void;
  removeEventListener(type: 'abort', listener: (event: unknown) => void): void;
}
declare type Fetcher = {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
};
declare interface ExportedHandler<Env = unknown> {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
  scheduled?(event: unknown, env: Env, ctx: ExecutionContext): void | Promise<void>;
}
declare interface DurableObjectStorage {
  get<T>(key: string): Promise<T | null>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  deleteAlarm(): Promise<void>;
  setAlarm(scheduledTime: number | Date): Promise<void>;
}

declare interface DurableObjectState {
  readonly storage: DurableObjectStorage;
}

declare interface DurableObjectStub {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  id: DurableObjectId;
}

declare interface DurableObjectId {
  toString(): string;
}

declare interface DurableObjectNamespace {
  new <Key extends string = string>(): DurableObjectNamespace;
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

declare interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
declare interface RequestInit {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit;
  redirect?: 'follow' | 'manual' | 'error';
  signal?: AbortSignal;
  duplex?: 'half';
}
declare type BodyInit = string | Uint8Array | ArrayBuffer | ReadableStream | URLSearchParams;
declare type RequestInfo = string | Request;
declare type ResponseInit = {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
};
