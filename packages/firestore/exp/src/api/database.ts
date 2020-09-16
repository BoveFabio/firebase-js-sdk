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

import { _getProvider, _removeServiceInstance } from '@firebase/app-exp';
import { _FirebaseService, FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { MAX_CONCURRENT_LIMBO_RESOLUTIONS } from '../../../src/core/firestore_client';
import {
  AsyncQueue,
  wrapInUserErrorIfRecoverable
} from '../../../src/util/async_queue';
import {
  ComponentConfiguration,
  IndexedDbOfflineComponentProvider,
  MultiTabOfflineComponentProvider,
  OnlineComponentProvider
} from '../../../src/core/component_provider';
import {
  FirebaseFirestore as LiteFirestore,
  Settings as LiteSettings
} from '../../../lite/src/api/database';
import { Code, FirestoreError } from '../../../src/util/error';
import { Deferred } from '../../../src/util/promise';
import { LruParams } from '../../../src/local/lru_garbage_collector';
import { CACHE_SIZE_UNLIMITED } from '../../../src/api/database';
import {
  indexedDbClearPersistence,
  indexedDbStoragePrefix
} from '../../../src/local/indexeddb_persistence';
import {
  getPersistence,
  getRemoteStore,
  getSyncEngine,
  removeComponents,
  setOfflineComponentProvider,
  setOnlineComponentProvider
} from './components';
import { DEFAULT_HOST, DEFAULT_SSL } from '../../../lite/src/api/components';
import { DatabaseInfo } from '../../../src/core/database_info';
import { AutoId } from '../../../src/util/misc';
import { User } from '../../../src/auth/user';
import { CredentialChangeListener } from '../../../src/api/credentials';
import { logDebug } from '../../../src/util/log';
import { registerPendingWritesCallback } from '../../../src/core/sync_engine';
import {
  remoteStoreDisableNetwork,
  remoteStoreEnableNetwork
} from '../../../src/remote/remote_store';
import { PersistenceSettings } from '../../../exp-types';

const LOG_TAG = 'Firestore';

export interface Settings extends LiteSettings {
  cacheSizeBytes?: number;
}

/**
 * The Cloud Firestore service interface.
 *
 * Do not call this constructor directly. Instead, use {@link getFirestore()
 * `getFirestore()`}.
 */
export class FirebaseFirestore
  extends LiteFirestore
  implements _FirebaseService {
  readonly _queue = new AsyncQueue();
  readonly _persistenceKey: string;
  readonly _clientId = AutoId.newId();

  private readonly _receivedInitialUser = new Deferred<void>();
  private _user = User.UNAUTHENTICATED;
  private _credentialListener: CredentialChangeListener = () => {};

  // We override the Settings property of the Lite SDK since the full Firestore
  // SDK supports more settings.
  protected _settings?: Settings;

  constructor(
    app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    super(app, authProvider);
    this._persistenceKey = app.name;
    this._credentials.setChangeListener(user => {
      this._user = user;
      this._receivedInitialUser.resolve();
    });
  }

  _setCredentialChangeListener(
    credentialListener: CredentialChangeListener
  ): void {
    logDebug(LOG_TAG, 'Registering credential change listener');
    this._credentialListener = credentialListener;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._receivedInitialUser.promise.then(() =>
      this._credentialListener(this._user)
    );
  }

  async _getConfiguration(): Promise<ComponentConfiguration> {
    const settings = this._getSettings();
    await this._receivedInitialUser.promise;
    const databaseInfo = new DatabaseInfo(
      this._databaseId,
      this._persistenceKey,
      settings.host ?? DEFAULT_HOST,
      settings.ssl ?? DEFAULT_SSL,
      /* forceLongPolling= */ false
    );
    return {
      asyncQueue: this._queue,
      databaseInfo,
      clientId: this._clientId,
      credentials: this._credentials,
      initialUser: this._user,
      maxConcurrentLimboResolutions: MAX_CONCURRENT_LIMBO_RESOLUTIONS,
      // Note: This will be overwritten if IndexedDB persistence is enabled.
      persistenceSettings: { durable: false }
    };
  }

  _getSettings(): Settings {
    return super._getSettings();
  }

  _terminate(): Promise<void> {
    this._queue.enterRestrictedMode();
    const deferred = new Deferred();
    this._queue.enqueueAndForgetEvenWhileRestricted(async () => {
      try {
        await super._terminate();
        await removeComponents(this);

        // `removeChangeListener` must be called after shutting down the
        // RemoteStore as it will prevent the RemoteStore from retrieving
        // auth tokens.
        this._credentials.removeChangeListener();

        deferred.resolve();
      } catch (e) {
        const firestoreError = wrapInUserErrorIfRecoverable(
          e,
          `Failed to shutdown persistence`
        );
        deferred.reject(firestoreError);
      }
    });
    return deferred.promise;
  }

  _verifyNotTerminated(): void {
    if (this._terminated) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'The client has already been terminated.'
      );
    }
  }
}

/**
 * Specifies custom settings to be used to configure the `Firestore`
 * instance. Must be set before invoking any other methods.
 *
 * @param settings The settings to use.
 */
export function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore {
  const firestore = _getProvider(
    app,
    'firestore-exp'
  ).getImmediate() as FirebaseFirestore;

  if (
    settings.cacheSizeBytes !== undefined &&
    settings.cacheSizeBytes !== CACHE_SIZE_UNLIMITED &&
    settings.cacheSizeBytes < LruParams.MINIMUM_CACHE_SIZE_BYTES
  ) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `cacheSizeBytes must be at least ${LruParams.MINIMUM_CACHE_SIZE_BYTES}`
    );
  }

  firestore._configureClient(settings);
  return firestore;
}

export function getFirestore(app: FirebaseApp): FirebaseFirestore {
  return _getProvider(app, 'firestore-exp').getImmediate() as FirebaseFirestore;
}

/**
 * Attempts to enable persistent storage, if possible.
 *
 * Must be called before any other methods (other than settings() and
 * clearPersistence()).
 *
 * If this fails, enablePersistence() will reject the promise it returns.
 * Note that even after this failure, the firestore instance will remain
 * usable, however offline persistence will be disabled.
 *
 * There are several reasons why this can fail, which can be identified by
 * the `code` on the error.
 *
 *   * failed-precondition: The app is already open in another browser tab.
 *   * unimplemented: The browser is incompatible with the offline
 *     persistence implementation.
 *
 * @param settings Optional settings object to configure persistence.
 * @return A promise that represents successfully enabling persistent
 * storage.
 */
export function enableIndexedDbPersistence(
  firestore: FirebaseFirestore,
  persistenceSettings?: PersistenceSettings
): Promise<void> {
  verifyNotInitialized(firestore);

  // `_getSettings()` freezes the client settings and prevents further changes
  // to the components (as `verifyNotInitialized()` would fail). Components can
  // then be accessed via `getOfflineComponentProvider()` and
  // `getOnlineComponentProvider()`
  const settings = firestore._getSettings();

  const onlineComponentProvider = new OnlineComponentProvider();
  const offlineComponentProvider = new IndexedDbOfflineComponentProvider(
    onlineComponentProvider
  );

  return firestore._queue.enqueue(async () => {
    await setOfflineComponentProvider(
      firestore,
      {
        durable: true,
        synchronizeTabs: false,
        cacheSizeBytes:
          settings.cacheSizeBytes || LruParams.DEFAULT_CACHE_SIZE_BYTES,
        forceOwningTab: !!persistenceSettings?.forceOwnership
      },
      offlineComponentProvider
    );
    await setOnlineComponentProvider(firestore, onlineComponentProvider);
  });
}

/**
 * Attempts to enable persistent storage, if possible.
 *
 * Must be called before any other methods (other than settings() and
 * clearPersistence()).
 *
 * If this fails, enablePersistence() will reject the promise it returns.
 * Note that even after this failure, the firestore instance will remain
 * usable, however offline persistence will be disabled.
 *
 * There are several reasons why this can fail, which can be identified by
 * the `code` on the error.
 *
 *   * failed-precondition: The app is already open in another browser tab.
 *   * unimplemented: The browser is incompatible with the offline
 *     persistence implementation.
 *
 * @param settings Optional settings object to configure persistence.
 * @return A promise that represents successfully enabling persistent
 * storage.
 */
export function enableMultiTabIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void> {
  verifyNotInitialized(firestore);

  // `_getSettings()` freezes the client settings and prevents further changes
  // to the components (as `verifyNotInitialized()` would fail). Components can
  // then be accessed via `getOfflineComponentProvider()` and
  // `getOnlineComponentProvider()`
  const settings = firestore._getSettings();

  const onlineComponentProvider = new OnlineComponentProvider();
  const offlineComponentProvider = new MultiTabOfflineComponentProvider(
    onlineComponentProvider
  );
  return firestore._queue.enqueue(async () => {
    await setOfflineComponentProvider(
      firestore,
      {
        durable: true,
        synchronizeTabs: true,
        cacheSizeBytes:
          settings.cacheSizeBytes || LruParams.DEFAULT_CACHE_SIZE_BYTES,
        forceOwningTab: false
      },
      offlineComponentProvider
    );
    await setOnlineComponentProvider(firestore, onlineComponentProvider);
  });
}

/**
 * Clears the persistent storage. This includes pending writes and cached
 * documents.
 *
 * Must be called while the firestore instance is not started (after the app
 * is shutdown or when the app is first initialized). On startup, this
 * method must be called before other methods (other than settings()). If
 * the firestore instance is still running, the promise will be rejected
 * with the error code of `failed-precondition`.
 *
 * Note: clearPersistence() is primarily intended to help write reliable
 * tests that use Cloud Firestore. It uses an efficient mechanism for
 * dropping existing data but does not attempt to securely overwrite or
 * otherwise make cached data unrecoverable. For applications that are
 * sensitive to the disclosure of cached data in between user sessions, we
 * strongly recommend not enabling persistence at all.
 *
 * @return A promise that is resolved when the persistent storage is
 * cleared. Otherwise, the promise is rejected with an error.
 */
export function clearIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void> {
  if (firestore._initialized && !firestore._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Persistence can only be cleared before a Firestore instance is ' +
        'initialized or after it is terminated.'
    );
  }

  const deferred = new Deferred<void>();
  firestore._queue.enqueueAndForgetEvenWhileRestricted(async () => {
    try {
      await indexedDbClearPersistence(
        indexedDbStoragePrefix(firestore._databaseId, firestore._persistenceKey)
      );
      deferred.resolve();
    } catch (e) {
      deferred.reject(e);
    }
  });
  return deferred.promise;
}

/**
 * Waits until all currently pending writes for the active user have been acknowledged by the
 * backend.
 *
 * The returned Promise resolves immediately if there are no outstanding writes. Otherwise, the
 * Promise waits for all previously issued writes (including those written in a previous app
 * session), but it does not wait for writes that were added after the method is called. If you
 * want to wait for additional writes, call `waitForPendingWrites()` again.
 *
 * Any outstanding `waitForPendingWrites()` Promises are rejected during user changes.
 *
 * @return A Promise which resolves when all currently pending writes have been
 * acknowledged by the backend.
 */
export function waitForPendingWrites(
  firestore: FirebaseFirestore
): Promise<void> {
  firestore._verifyNotTerminated();

  const deferred = new Deferred<void>();
  firestore._queue.enqueueAndForget(async () => {
    const syncEngine = await getSyncEngine(firestore);
    return registerPendingWritesCallback(syncEngine, deferred);
  });
  return deferred.promise;
}

/**
 * Re-enables use of the network for this Firestore instance after a prior
 * call to {@link firebase.firestore.Firestore.disableNetwork
 * `disableNetwork()`}.
 *
 * @return A promise that is resolved once the network has been
 *   enabled.
 */
export function enableNetwork(firestore: FirebaseFirestore): Promise<void> {
  firestore._verifyNotTerminated();

  return firestore._queue.enqueue(async () => {
    const remoteStore = await getRemoteStore(firestore);
    const persistence = await getPersistence(firestore);
    persistence.setNetworkEnabled(true);
    return remoteStoreEnableNetwork(remoteStore);
  });
}

/**
 * Disables network usage for this instance. It can be re-enabled via
 * {@link firebase.firestore.Firestore.enableNetwork `enableNetwork()`}. While
 * the network is disabled, any snapshot listeners or get() calls will return
 * results from cache, and any write operations will be queued until the network
 * is restored.
 *
 * @return A promise that is resolved once the network has been
 *   disabled.
 */
export function disableNetwork(firestore: FirebaseFirestore): Promise<void> {
  firestore._verifyNotTerminated();

  return firestore._queue.enqueue(async () => {
    const remoteStore = await getRemoteStore(firestore);
    const persistence = await getPersistence(firestore);
    persistence.setNetworkEnabled(false);
    return remoteStoreDisableNetwork(remoteStore);
  });
}

/**
 * Terminates this Firestore instance.
 *
 * After calling `terminate()` only the `clearPersistence()` method may be used. Any other method
 * will throw a `FirestoreError`.
 *
 * To restart after termination, create a new instance of FirebaseFirestore with
 * `firebase.firestore()`.
 *
 * Termination does not cancel any pending writes, and any promises that are awaiting a response
 * from the server will not be resolved. If you have persistence enabled, the next time you
 * start this instance, it will resume sending these writes to the server.
 *
 * Note: Under normal circumstances, calling `terminate()` is not required. This
 * method is useful only when you want to force this instance to release all of its resources or
 * in combination with `clearPersistence()` to ensure that all local state is destroyed
 * between test runs.
 *
 * @return A promise that is resolved when the instance has been successfully terminated.
 */
export function terminate(firestore: FirebaseFirestore): Promise<void> {
  _removeServiceInstance(firestore.app, 'firestore-exp');
  return firestore._delete();
}

function verifyNotInitialized(firestore: FirebaseFirestore): void {
  if (firestore._initialized || firestore._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore has already been started and persistence can no longer be ' +
        'enabled. You can only enable persistence before calling any other ' +
        'methods on a Firestore object.'
    );
  }
}
