/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { FirebaseApp } from '@firebase/app-types-exp';
export class FieldPath {
  // Note: This class is stripped down a copy of the FieldPath class in the
  // legacy SDK. The changes are:
  // - The `documentId()` static method has been removed
  // - Input validation is limited to errors that cannot be caught by the
  //   TypeScript transpiler.
  /**
   * Creates a FieldPath from the provided field names. If more than one field
   * name is provided, the path will point to a nested field in a document.
   *
   * @param fieldNames A list of field names.
   */
  constructor(...fieldNames: string[]);
  isEqual(other: FieldPath): boolean;
}
export function documentId(): FieldPath;
export class FirebaseFirestore {
  /** @hideconstructor */
  private constructor();
}
export function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore;
export function getFirestore(app: FirebaseApp): FirebaseFirestore;
export function enableIndexedDbPersistence(
  firestore: FirebaseFirestore,
  persistenceSettings?: PersistenceSettings
): Promise<void>;
export function enableMultiTabIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void>;
export function clearIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void>;
export function waitForPendingWrites(
  firestore: FirebaseFirestore
): Promise<void>;
export function disableNetwork(firestore: FirebaseFirestore): Promise<void>;
export function enableNetwork(firestore: FirebaseFirestore): Promise<void>;
export function terminate(firestore: FirebaseFirestore): Promise<void>;
export interface Settings {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
  cacheSizeBytes?: number;
}
export interface PersistenceSettings {
  forceOwnership?: boolean;
}
export interface DocumentChange<T = DocumentData> {
  readonly type: DocumentChangeType;
  readonly doc: QueryDocumentSnapshot<T>;
  readonly oldIndex: number;
  readonly newIndex: number;
}
export class DocumentSnapshot<T = DocumentData> {
  readonly metadata: SnapshotMetadata;
  /** @hideconstructor protected */
  protected constructor();
  exists(): this is QueryDocumentSnapshot<T>;
  data(options?: SnapshotOptions): T | undefined;
  // We are using `any` here to avoid an explicit cast by our users.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(fieldPath: string | FieldPath, options: SnapshotOptions): any;
}
export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<
  T
> {
  data(options: SnapshotOptions): T;
}
export class QuerySnapshot<T = DocumentData> {
  readonly metadata: SnapshotMetadata;
  readonly query: Query<T>;
  /** @hideconstructor */
  private constructor();
  get docs(): Array<QueryDocumentSnapshot<T>>;
  get size(): number;
  get empty(): boolean;
  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: unknown
  ): void;
  docChanges(options: SnapshotListenOptions): Array<DocumentChange<T>>;
}
export function snapshotEqual<T>(
  left: DocumentSnapshot<T> | QuerySnapshot<T>,
  right: DocumentSnapshot<T> | QuerySnapshot<T>
): boolean;
export interface SnapshotOptions {
  readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
}
export interface FirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData;
  toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData>,
    options?: SnapshotOptions
  ): T;
}
export type DocumentChangeType = 'added' | 'removed' | 'modified';
export class SnapshotMetadata {
  readonly hasPendingWrites: boolean;
  readonly fromCache: boolean;
  /** @hideconstructor */
  private constructor();
  isEqual(other: SnapshotMetadata): boolean;
}
export class DocumentReference<T = DocumentData> {
  readonly type = 'document';
  readonly firestore: FirebaseFirestore;
  readonly converter: FirestoreDataConverter<T> | null;
  /** @hideconstructor */
  private constructor();
  get id(): string;
  get path(): string;
  get parent(): CollectionReference<T>;
  collection(path: string): CollectionReference<DocumentData>;
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
}
export class CollectionReference<T = DocumentData> extends Query<T> {
  readonly type = 'collection';
  readonly firestore: FirebaseFirestore;
  /** @hideconstructor */
  private constructor();
  get id(): string;
  get path(): string;
  get parent(): DocumentReference<DocumentData> | null;
  doc(path?: string): DocumentReference<T>;
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U>;
}
export abstract class QueryConstraint {
  abstract readonly type: QueryConstraintType;
}
export class Query<T = DocumentData> {
  readonly type: 'query' | 'collection';
  readonly firestore: FirebaseFirestore;
  readonly converter: FirestoreDataConverter<T> | null;
  // This is the lite version of the Query class in the main SDK.
  /** @hideconstructor protected */
  protected constructor();
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}
export function doc(
  firestore: FirebaseFirestore,
  documentPath: string
): DocumentReference<DocumentData>;
export function doc<T>(
  reference: CollectionReference<T>,
  documentPath?: string
): DocumentReference<T>;
export function doc(
  reference: DocumentReference<unknown>,
  documentPath: string
): DocumentReference<DocumentData>;
export function doc<T>(
  parent:
    | FirebaseFirestore
    | CollectionReference<T>
    | DocumentReference<unknown>,
  relativePath?: string
): DocumentReference;
export function collection(
  firestore: FirebaseFirestore,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  reference: CollectionReference<unknown>,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  reference: DocumentReference,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  parent:
    | FirebaseFirestore
    | DocumentReference<unknown>
    | CollectionReference<unknown>,
  relativePath: string
): CollectionReference<DocumentData>;
export function collectionGroup(
  firestore: FirebaseFirestore,
  collectionId: string
): Query<DocumentData>;
export function startAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint;
export function startAfter(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint;
export function endAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint;
export function endBefore(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint;
export function query<T>(
  query: Query<T>,
  ...queryConstraints: QueryConstraint[]
): Query<T>;
export function limit(n: number): QueryConstraint;
export function limitToLast(n: number): QueryConstraint;
export function where(
  fieldPath: string | FieldPath,
  opStr: WhereFilterOp,
  value: unknown
): QueryConstraint;
export function orderBy(
  field: string | FieldPath,
  directionStr: OrderByDirection
): QueryConstraint;
export type SetOptions =
  | {
      readonly merge?: boolean;
    }
  | {
      readonly mergeFields?: Array<string | FieldPath>;
    };
export type QueryConstraintType =
  | 'where'
  | 'orderBy'
  | 'limit'
  | 'limitToLast'
  | 'startAt'
  | 'startAfter'
  | 'endAt'
  | 'endBefore';
export interface DocumentData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}
export interface UpdateData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [fieldPath: string]: any;
}
export type OrderByDirection = 'desc' | 'asc';
export type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '>='
  | '>'
  | 'array-contains'
  | 'in'
  | 'array-contains-any';
export interface Unsubscribe {
  (): void;
}
export function runTransaction<T>(
  firestore: FirebaseFirestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T>;
export class Transaction {
  // This class implements the same logic as the Transaction API in the Lite SDK
  // but is subclassed in order to return its own DocumentSnapshot types.
  /** @hideconstructor */
  private constructor();
  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
}
export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export function getDocFromCache<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export function getDocFromServer<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
export function getDocsFromCache<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
export function getDocsFromServer<T>(
  query: Query<T>
): Promise<QuerySnapshot<T>>;
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<T>(
  query: Query<T>,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onSnapshot<T>(
  query: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<T>(
  ref: Query<T> | DocumentReference<T>,
  ...args: unknown[]
): Unsubscribe;
export function onSnapshotsInSync(
  firestore: FirebaseFirestore,
  observer: {
    next?: (value: void) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onSnapshotsInSync(
  firestore: FirebaseFirestore,
  onSync: () => void
): Unsubscribe;
export function onSnapshotsInSync(
  firestore: FirebaseFirestore,
  arg: unknown
): Unsubscribe;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T
): Promise<void>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: Partial<T>,
  options: SetOptions
): Promise<void>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T,
  options?: SetOptions
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  data: UpdateData
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  field: string | FieldPath,
  value: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  fieldOrUpdateData: string | FieldPath | UpdateData,
  value?: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function deleteDoc(reference: DocumentReference<unknown>): Promise<void>;
export function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>>;
export abstract class FieldValue {}
export function deleteField(): FieldValue;
export function increment(n: number): FieldValue;
export function arrayRemove(...elements: unknown[]): FieldValue;
export function arrayUnion(...elements: unknown[]): FieldValue;
export function serverTimestamp(): FieldValue;
export function setLogLevel(newLevel: LogLevelString | LogLevel): void;
export declare enum LogLevel {
  DEBUG = 0,
  VERBOSE = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}
export declare type LogLevelString =
  | 'debug'
  | 'verbose'
  | 'info'
  | 'warn'
  | 'error'
  | 'silent';
export class Bytes {
  /** @hideconstructor */
  private constructor();
  static fromBase64String(base64: string): Bytes;
  static fromUint8Array(array: Uint8Array): Bytes;
  toBase64(): string;
  toUint8Array(): Uint8Array;
  toString(): string;
  isEqual(other: Bytes): boolean;
}
export function writeBatch(firestore: FirebaseFirestore): WriteBatch;
export class WriteBatch {
  /** @hideconstructor */
  private constructor();
  set<T>(documentRef: DocumentReference<T>, value: T): WriteBatch;
  set<T>(
    documentRef: DocumentReference<T>,
    value: Partial<T>,
    options: SetOptions
  ): WriteBatch;
  set<T>(
    documentRef: DocumentReference<T>,
    value: T,
    options?: SetOptions
  ): WriteBatch;
  update(
    documentRef: DocumentReference<unknown>,
    value: UpdateData
  ): WriteBatch;
  update(
    documentRef: DocumentReference<unknown>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  update(
    documentRef: DocumentReference<unknown>,
    fieldOrUpdateData: string | FieldPath | UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  delete(documentRef: DocumentReference<unknown>): WriteBatch;
  commit(): Promise<void>;
  private verifyNotCommitted(): void;
}
export class GeoPoint {
  constructor(latitude: number, longitude: number);
  /**
   * Returns the latitude of this geo point, a number between -90 and 90.
   */
  get latitude(): number;
  /**
   * Returns the longitude of this geo point, a number between -180 and 180.
   */
  get longitude(): number;
  isEqual(other: GeoPoint): boolean;
  toJSON(): {
    latitude: number;
    longitude: number;
  };
}
export class Timestamp {
  static now(): Timestamp;
  static fromDate(date: Date): Timestamp;
  static fromMillis(milliseconds: number): Timestamp;
  readonly seconds: number;
  readonly nanoseconds: number;
  /** @hideconstructor */
  private constructor();
  toDate(): Date;
  toMillis(): number;
  isEqual(other: Timestamp): boolean;
  toString(): string;
  toJSON(): {
    seconds: number;
    nanoseconds: number;
  };
  valueOf(): string;
}
export function refEqual<T>(
  left: DocumentReference<T> | CollectionReference<T>,
  right: DocumentReference<T> | CollectionReference<T>
): boolean;
export function queryEqual<T>(left: Query<T>, right: Query<T>): boolean;
export interface SnapshotListenOptions {
  readonly includeMetadataChanges?: boolean;
}
export const CACHE_SIZE_UNLIMITED = -1;
export type FirestoreErrorCode =
  | 'cancelled'
  | 'unknown'
  | 'invalid-argument'
  | 'deadline-exceeded'
  | 'not-found'
  | 'already-exists'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'unavailable'
  | 'data-loss'
  | 'unauthenticated';
export class FirestoreError extends Error {
  readonly name = 'FirebaseError';
  readonly stack?: string;
  readonly code: FirestoreErrorCode;
  readonly message: string;
  /** @hideconstructor */
  private constructor();
}
