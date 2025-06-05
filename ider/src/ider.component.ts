import { Component, OnDestroy, input, output, inject, DestroyRef, effect } from '@angular/core'
import { AMTRedirector, Protocol, AMTIDER, RedirectorConfig } from '@device-management-toolkit/ui-toolkit/core'

export interface IDERData {
  floppyRead: number
  floppyWrite: number
  cdromRead: number
  cdromWrite: number
}

@Component({
  selector: 'amt-ider',
  template: '',
  styles: []
})
export class IDERComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef)

  redirector: AMTRedirector | null
  ider: AMTIDER | null
  data: IDERData | null
  deviceState = 0

  readonly deviceStatus = output<number>()
  readonly iderData = output<IDERData>()

  readonly deviceConnection = input<boolean>(false)
  public readonly cdrom = input<File | null>(null)
  public readonly floppy = input<File | null>(null)
  public mpsServer = input('')
  public authToken = input('')
  public deviceId = input('')

  constructor() {
    // React to deviceConnection changes
    effect(() => {
      const connected = this.deviceConnection()
      if (connected) {
        if (this.redirector == null) {
          this.init()
        }
      } else {
        this.stopIder()
      }
    })
  }

  init(): void {
    this.instantiate()
    setTimeout(() => {
      this.startIder()
    }, 4000)
  }

  startIder(): void {
    if (this.redirector != null) {
      this.redirector.start(WebSocket)
    }
  }

  instantiate(): void {
    const config: RedirectorConfig = {
      mode: 'ider',
      protocol: Protocol.IDER,
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
    this.ider = new AMTIDER(this.redirector, this.cdrom(), this.floppy())
    this.redirector.onNewState = this.ider.stateChange.bind(this.ider)
    this.redirector.onStateChanged = this.onConnectionStateChange.bind(this)
    this.redirector.onProcessData = this.ider.processData.bind(this.ider)
    this.ider.sectorStats = this.iderSectorStats.bind(this)
  }

  iderSectorStats(mode: number, dev: number, total: number, start: number, len: number): void {
    if (this.ider == null) {
      return
    }
    if (mode === 1) {
      if (dev === 0) {
        // Floppy
        this.ider.floppyRead += len * 512
      } else {
        // CD-ROM
        this.ider.cdromRead += len * 2048
      }
    } else {
      if (dev === 0) {
        // Floppy
        this.ider.floppyWrite += len * 512
      } else {
        // CD-ROM
        this.ider.cdromWrite += len * 2048
      }
    }
    this.iderData.emit({
      floppyRead: this.ider.floppyRead,
      cdromRead: this.ider.cdromRead,
      floppyWrite: this.ider.floppyWrite,
      cdromWrite: this.ider.cdromWrite
    })
  }

  onConnectionStateChange = (redirector: any, state: number): any => {
    this.deviceStatus.emit(state)
  }

  stopIder(): void {
    if (this.redirector != null) {
      this.redirector.stop()
      this.cleanup()
    }
  }

  cleanup(): void {
    this.redirector = null
    this.ider = null
  }

  ngOnDestroy(): void {
    if (this.ider != null) {
      this.ider.stop()
    }
  }
}
