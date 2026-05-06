// Cloudflare Workers runtime type stubs - provides types not available without @cloudflare/workers-types
declare class D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}
declare class D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
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
declare class KVNamespace {
  get(key: string, options?: { type: 'text' }): Promise<string | null>;
  get(key: string, options: { type: 'json' }): Promise<unknown | null>;
  get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<KVNamespaceListResult>;
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
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
declare class Response {
  constructor(body?: BodyInit | null, init?: ResponseInit);
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  json(): Promise<unknown>;
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
declare type HeadersInit = Record<string, string> | [string, string][];
declare class URL {
  constructor(url: string, base?: string);
  readonly protocol: string;
  readonly hostname: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly searchParams: URLSearchParams;
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
declare class TransformStream {
  readonly readable: ReadableStream;
  readonly writable: WritableStream;
  constructor();
}
declare class TextEncoder {
  constructor();
  encode(input?: string): Uint8Array;
}
declare class ReadableStream<R = Uint8Array> {
  constructor();
  getReader(): ReadableStreamDefaultReader<R>;
}
declare class ReadableStreamDefaultReader<R = Uint8Array> {
  read(): Promise<{ done: boolean; value: R }>;
  releaseLock(): void;
}
declare class WritableStream {
  constructor();
  getWriter(): WritableStreamDefaultWriter;
}
declare class WritableStreamDefaultWriter {
  write(chunk: unknown): Promise<void>;
  close(): Promise<void>;
  releaseLock(): void;
}
declare interface Crypto {
  randomUUID(): string;
  subtle: SubtleCrypto;
}
declare interface SubtleCrypto {
  digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>;
  sign(algorithm: string, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
  verify(algorithm: string, key: CryptoKey, signature: BufferSource, data: BufferSource): Promise<boolean>;
}
declare type BufferSource = ArrayBuffer | Uint8Array;
declare var crypto: Crypto;
declare interface AbortSignal {
  aborted: boolean;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}
declare interface RequestInit {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit;
  redirect?: 'follow' | 'manual' | 'error';
  signal?: AbortSignal;
}
declare type BodyInit = string | Uint8Array | ReadableStream | FormData;
declare type RequestInfo = string | Request;
declare type ResponseInit = {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
};
declare type ExportedHandler<Env = unknown> = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
};
declare interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
