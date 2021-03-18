import { Injectable } from '@angular/core'
import { RxChangeEvent, RxCollection, RxDatabase, RxDocument, RxJsonSchema } from 'rxdb'

// @ts-ignore
import pouchdbAdapterIdb from 'pouchdb-adapter-idb'
import { addRxPlugin, createRxDatabase } from 'rxdb'
import { BehaviorSubject, from, Observable, of } from 'rxjs'
import { filter, map, switchMap } from 'rxjs/operators'

// Set up the adapter
addRxPlugin(pouchdbAdapterIdb)

// The model
export class Wallet {
  id?: string
  name?: string
  publicKey?: string
  secret?: string
}

// You can add methods on the docs
export type WalletDocMethods = {
  convert: (v: string) => string
}

// we declare one static ORM-method for the collection
export type WalletCollectionMethods = {
  countAllDocuments: () => Promise<number>
}

// and then merge all our types
export type WalletCollection = RxCollection<Wallet, WalletDocMethods, WalletCollectionMethods>

export type WalletDatabaseCollections = {
  wallets: WalletCollection
}

export type WalletDatabase = RxDatabase<WalletDatabaseCollections>

export type WalletDocument = RxDocument<Wallet, WalletDocMethods>

export const walletSchema: RxJsonSchema<Wallet> = {
  title: 'Wallet Schema',
  description: 'Describes a wallet',
  version: 0,
  keyCompression: true,
  type: 'object',
  indexes: ['name'],
  properties: {
    id: {
      type: 'string',
      primary: true,
    },
    name: {
      type: 'string',
    },
    publicKey: {
      type: 'string',
    },
    secret: {
      type: 'string',
    },
  },
  required: ['id', 'name', 'publicKey', 'secret'],
}

export const walletDocMethods: WalletDocMethods = {
  convert(this: WalletDocument, what: string): string {
    return this.name + ' screams: ' + what.toUpperCase()
  },
}

export const walletCollectionMethods: WalletCollectionMethods = {
  async countAllDocuments(this: WalletCollection): Promise<number> {
    const allDocs = await this.find().exec()
    return allDocs.length
  },
}

const randomId = (size = 5) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')

@Injectable({
  providedIn: 'root',
})
export class RxdbService {
  private readonly loaded = new BehaviorSubject(false)
  private readonly loaded$ = this.loaded.asObservable()
  private walletDatabase!: WalletDatabase

  constructor() {
    this.init().then(() => this.loaded.next(true))
  }

  async init(): Promise<void> {
    this.walletDatabase = await createRxDatabase<WalletDatabaseCollections>({
      name: 'wallets',
      adapter: 'idb',
      ignoreDuplicate: true,
    })

    await this.walletDatabase.addCollections({
      wallets: {
        schema: walletSchema,
        methods: walletDocMethods,
        statics: walletCollectionMethods,
      },
    })
  }

  wallets(): Observable<Wallet[]> {
    return this.loaded$.pipe(
      filter((loaded) => loaded),
      switchMap(() => this.walletDatabase.wallets.find().sort({ name: 'asc' }).exec()),
    )
  }

  walletChanges$(): Observable<RxChangeEvent> {
    return this.loaded$.pipe(
      filter((loaded) => loaded),
      switchMap(() => this.walletDatabase?.wallets?.$),
    )
  }

  walletsCount(): Observable<number> {
    return this.loaded$.pipe(
      filter((loaded) => loaded),
      switchMap(() => this.walletDatabase?.wallets.countAllDocuments()),
    )
  }

  wallet(walletId: string): Observable<Wallet | null> {
    return this.loaded$.pipe(
      filter((loaded) => loaded),
      switchMap(() => this.walletDatabase?.wallets.findOne({ selector: { id: walletId } }).exec()),
    )
  }

  createWallet(): Observable<any> {
    return of(true).pipe(
      switchMap(() =>
        this.walletsCount().pipe(
          switchMap((count) => {
            const id = `${count + 1}`
            return this.createWalletRecord(randomId(), `Wallet ${id}`, `Public ${id}`, `Secret ${id}`)
          }),
        ),
      ),
    )
  }

  private createWalletRecord(id: string, name: string, publicKey: string, secret: string): Observable<any> {
    return from(
      this.walletDatabase.wallets.insert({
        id,
        name,
        publicKey,
        secret,
      }),
    )
  }
}
