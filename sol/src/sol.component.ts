/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import {
  Component,
  ViewEncapsulation,
  OnDestroy,
  AfterViewInit,
  input,
  output,
  inject,
  DestroyRef,
  effect
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Terminal } from '@xterm/xterm'
import {
  AmtTerminal,
  AMTRedirector,
  TerminalDataProcessor,
  RedirectorConfig,
  Protocol
} from '@device-management-toolkit/ui-toolkit/core'
import { TerminalComponent } from './terminal/terminal.component'

@Component({
  selector: 'amt-sol',
  templateUrl: './sol.component.html',
  styleUrls: ['./sol.component.css'],
  encapsulation: ViewEncapsulation.None,
  imports: [TerminalComponent]
})
export class SOLComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef)

  terminal: AmtTerminal
  container!: any
  term: Terminal
  redirector: AMTRedirector
  dataProcessor: TerminalDataProcessor
  deviceState = 0

  readonly deviceStatus = output<number>()
  readonly deviceConnection = input<boolean>(false)
  public mpsServer = input('')
  public authToken = input('')
  public deviceId = input('')

  constructor() {
    // React to deviceConnection changes
    effect(() => {
      const connected = this.deviceConnection()
      if (connected) {
        if (this.redirector == null) {
          this.instantiate()
        }
        this.startSol()
      } else if (this.redirector != null) {
        this.stopSol()
      }
    })
  }

  instantiate(): void {
    this.terminal = new AmtTerminal()
    this.dataProcessor = new TerminalDataProcessor(this.terminal)
    const config: RedirectorConfig = {
      mode: 'sol',
      protocol: Protocol.SOL,
      fr: new FileReader(),
      host: this.deviceId(),
      port: 16994,
      user: '',
      pass: '',
      tls: 0,
      tls1only: 0,
      authToken: this.authToken(),
      server: this.mpsServer()
    }
    this.redirector = new AMTRedirector(config)
    this.terminal.onSend = this.redirector.send.bind(this.redirector)
    this.redirector.onNewState = this.terminal.StateChange.bind(this.terminal)
    this.redirector.onStateChanged = this.onTerminalStateChange.bind(this)
    this.redirector.onProcessData = this.dataProcessor.processData.bind(this)
    this.dataProcessor.processDataToXterm = this.handleWriteToXterm.bind(this)
    this.dataProcessor.clearTerminal = this.handleClearTerminal.bind(this)
    this.term = new Terminal({
      rows: 30,
      cols: 100,
      cursorStyle: 'block',
      fontWeight: 'bold'
    })
  }

  handleKeyPress(domEvent: any): void {
    this.terminal?.TermSendKeys(domEvent)
  }

  handleClearTerminal(): void {
    this.term?.reset()
  }

  handleWriteToXterm(str: string): void {
    this.term?.write(str)
  }

  onTerminalStateChange(redirector: AMTRedirector, state: number): void {
    this.deviceStatus.emit(state)
    this.deviceState = state
  }

  startSol(): void {
    if (this.redirector != null) {
      this.redirector.start(WebSocket)
    }
  }

  stopSol(): void {
    if (this.redirector != null) {
      this.redirector.stop()
      this.handleClearTerminal()
      this.term?.dispose()
      this.cleanup()
    }
  }

  cleanup(): void {
    ;(this.terminal as any) = null
    ;(this.redirector as any) = null
    ;(this.dataProcessor as any) = null
    ;(this.term as any) = null
  }

  ngOnDestroy(): void {
    this.stopSol()
  }
}
