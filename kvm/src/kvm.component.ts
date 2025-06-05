/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  viewChild,
  input,
  output,
  inject,
  Renderer2,
  effect,
  signal,
  DestroyRef
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
  AMTDesktop,
  AMTKvmDataRedirector,
  RedirectorConfig,
  DataProcessor,
  IDataProcessor,
  KeyBoardHelper,
  MouseHelper,
  Protocol
} from '@device-management-toolkit/ui-toolkit/core'
import { fromEvent, timer, Subscription } from 'rxjs'
import { throttleTime } from 'rxjs/operators'

interface EncodingOption {
  value: number
  viewValue: string
}

@Component({
  selector: 'amt-kvm',
  templateUrl: './kvm.component.html',
  styleUrls: ['./kvm.component.css']
})
export class KVMComponent implements OnDestroy {
  private readonly renderer = inject(Renderer2)
  private readonly destroyRef = inject(DestroyRef)

  readonly canvas = viewChild<ElementRef>('canvas')
  readonly device = viewChild.required<string>('device')

  // Canvas properties
  public context: CanvasRenderingContext2D | null = null
  public width = signal(400)
  public height = signal(400)

  // Input properties
  public isFullscreen = input(false)
  public mpsServer = input('')
  public authToken = input('')
  public deviceId = input('')

  // Input/Output properties
  readonly deviceStatus = output<number>()
  readonly deviceConnection = input<boolean>(false)
  readonly selectedEncoding = input<number>(1)

  // Component state
  module: AMTDesktop | null = null
  redirector: AMTKvmDataRedirector | null = null
  dataProcessor: IDataProcessor | null = null
  mouseHelper: MouseHelper | null = null
  keyboardHelper: KeyBoardHelper | null = null
  selected = signal(1)
  private mouseMove$?: Subscription

  readonly encodings: EncodingOption[] = [
    { value: 1, viewValue: 'RLE 8' },
    { value: 2, viewValue: 'RLE 16' }
  ]

  constructor() {
    effect(() => {
      this.toggleFullscreen()
    })

    // React to deviceConnection changes
    effect(() => {
      const connected = this.deviceConnection()
      if (connected && this.redirector == null) {
        console.log('KVMComponent: Device connected, initializing KVM...')
        this.init()
      } else if (!connected) {
        console.log('KVMComponent: Device disconnected, stopping KVM...')
        this.stopKvm()
      }
    })

    // React to selectedEncoding changes
    effect(() => {
      if (this.selectedEncoding() === this.selected() || !this.deviceConnection()) return
      console.log('KVMComponent: Encoding changed to', this.selectedEncoding())
      const encoding = this.selectedEncoding()
      this.selected.set(encoding)
      this.onEncodingChange()
    })
  }

  toggleFullscreen(): void {
    const canvasElement = this.canvas()?.nativeElement
    if (!canvasElement) return

    if (this.isFullscreen()) {
      if (canvasElement.requestFullscreen) {
        canvasElement.requestFullscreen()
      }
      this.renderer.addClass(canvasElement, 'fullscreen')
    } else {
      if (document.exitFullscreen && document.fullscreenElement != null) {
        document.exitFullscreen()
      }
      this.renderer.removeClass(canvasElement, 'fullscreen')
    }
    this.mouseHelper?.resetOffsets()
  }

  instantiate(): void {
    const canvas = this.canvas()
    this.context = canvas?.nativeElement.getContext('2d') || null
    const config: RedirectorConfig = {
      mode: 'kvm',
      protocol: Protocol.KVM,
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
    this.redirector = new AMTKvmDataRedirector(config)
    this.module = new AMTDesktop(this.context)
    this.dataProcessor = new DataProcessor(this.redirector, this.module)
    this.mouseHelper = new MouseHelper(this.module, this.redirector, 200)
    this.keyboardHelper = new KeyBoardHelper(this.module, this.redirector)
    this.redirector.onProcessData = this.module.processData.bind(this.module)
    this.redirector.onStart = this.module.start.bind(this.module)
    this.redirector.onNewState = this.module.onStateChange.bind(this.module)
    this.redirector.onSendKvmData = this.module.onSendKvmData.bind(this.module)
    this.redirector.onStateChanged = this.onConnectionStateChange.bind(this)
    this.redirector.onError = this.onRedirectorError.bind(this)
    this.module.onSend = this.redirector.send.bind(this.redirector)
    this.module.onProcessData = this.dataProcessor.processData.bind(this.dataProcessor)
    this.module.bpp = this.selected()

    this.mouseMove$ = fromEvent<MouseEvent>(canvas?.nativeElement, 'mousemove')
      .pipe(throttleTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe((event: MouseEvent) => {
        this.mouseHelper?.mousemove(event)
      })
  }

  private onConnectionStateChange = (redirector: any, state: number): void => {
    this.deviceStatus.emit(state)
  }

  onRedirectorError(): void {
    this.reset()
  }

  init(): void {
    this.instantiate()
    setTimeout(() => {
      this.autoConnect()
    }, 4000)
  }

  autoConnect(): void {
    if (this.redirector) {
      this.redirector.start(WebSocket)
      this.keyboardHelper?.GrabKeyInput()
    }
  }

  private onEncodingChange(): void {
    this.stopKvm()
    timer(1000).subscribe(() => {
      this.autoConnect()
    })
  }

  reset(): void {
    this.redirector = null
    this.module = null
    this.dataProcessor = null
    this.height.set(400)
    this.width.set(400)
    this.instantiate()
  }

  stopKvm(): void {
    this.redirector?.stop()
    this.keyboardHelper?.UnGrabKeyInput()
    this.reset()
  }

  onMouseup(event: MouseEvent): void {
    this.mouseHelper?.mouseup(event)
  }

  onMousedown(event: MouseEvent): void {
    this.mouseHelper?.mousedown(event)
  }

  onMousemove(event: MouseEvent): void {
    this.mouseHelper?.mousemove(event)
  }

  ngOnDestroy(): void {
    this.mouseMove$?.unsubscribe()
    this.stopKvm()
  }
}
