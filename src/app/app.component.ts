import { Component } from '@angular/core'
import { RxdbService } from './rxdb.service'

@Component({
  selector: 'app-root',
  template: `
    <div>
      <ng-container *ngIf="walletsCount$ | async as count">
        <h1>Total wallets: {{ count }}</h1>
      </ng-container>
      <button (click)="createWallet()">Create Wallet</button>
      <ng-container *ngIf="walletChanges$ | async as walletChanges">
        <pre>{{ walletChanges | json }}</pre>
      </ng-container>
      <ng-container *ngIf="wallets$ | async as wallets">
        <pre>{{ wallets | json }}</pre>
      </ng-container>
    </div>
  `,
})
export class AppComponent {
  readonly wallets$ = this.rxdb.wallets()
  readonly walletChanges$ = this.rxdb.walletChanges$()
  readonly walletsCount$ = this.rxdb.walletsCount()
  constructor(private readonly rxdb: RxdbService) {}

  createWallet(): void {
    this.rxdb.createWallet().subscribe()
  }
}
