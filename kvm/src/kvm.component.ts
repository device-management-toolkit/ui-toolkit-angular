/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  viewChild,
  input,
  output,
  EventEmitter,
  inject,
  Renderer2,
  computed,
  model,
  effect
} from '@angular/core'
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
import { Observable, fromEvent, timer } from 'rxjs'
import { throttleTime } from 'rxjs/operators'

@Component({
  selector: 'amt-kvm',
  templateUrl: './kvm.component.html',
  styleUrls: ['./kvm.component.css']
})
export class KVMComponent implements OnInit, AfterViewInit, OnDestroy {
  renderer = inject(Renderer2)
  readonly canvas = viewChild<ElementRef>('canvas')
  readonly device = viewChild.required<string>('device')
  public context!: CanvasRenderingContext2D
  public isFullscreen = input(false)

  //setting a width and height for the canvas

  public width = 400
  public height = 400
  public mpsServer = input('')
  public authToken = input('')
  public deviceId = input('')

  readonly deviceStatus = output<number>()
  readonly deviceConnection = input(new EventEmitter<boolean>())
  readonly selectedEncoding = input(new EventEmitter<number>())

  module: AMTDesktop | null
  redirector: AMTKvmDataRedirector | null
  dataProcessor!: IDataProcessor | null
  mouseHelper!: MouseHelper
  keyboardHelper!: KeyBoardHelper
  powerState: any = 0
  selected = 1
  timeInterval!: any
  mouseMove: Observable<MouseEvent>
  encodings = [
    { value: 1, viewValue: 'RLE 8' },
    { value: 2, viewValue: 'RLE 16' }
  ]

  constructor() {
    effect(() => {
      this.toggleFullscreen()
    })
  }
  ngOnInit(): void {
    this.deviceConnection().subscribe((data: boolean) => {
      if (data) {
        this.init()
      } else {
        this.stopKvm()
      }
    })
    this.selectedEncoding().subscribe((data) => {
      this.selected = data
      this.onEncodingChange()
    })
  }

  ngAfterViewInit(): void {
    this.init()
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
    if (this.mouseHelper != null) {
      this.mouseHelper.resetOffsets()
    }
  }

  instantiate(): void {
    const canvas = this.canvas()
    this.context = canvas?.nativeElement.getContext('2d')
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
    this.module.bpp = this.selected

    this.mouseMove = fromEvent(canvas?.nativeElement, 'mousemove')
    this.mouseMove.pipe(throttleTime(200)).subscribe((event: MouseEvent) => {
      if (this.mouseHelper != null) {
        this.mouseHelper.mousemove(event)
      }
    })
  }

  onConnectionStateChange = (redirector: any, state: number): any => {
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
    if (this.redirector != null) {
      this.redirector.start(WebSocket)
      this.keyboardHelper.GrabKeyInput()
    }
  }

  onEncodingChange(): void {
    this.stopKvm()
    timer(1000).subscribe(() => {
      this.autoConnect()
    })
  }

  reset = (): void => {
    this.redirector = null
    this.module = null
    this.dataProcessor = null
    this.height = 400
    this.width = 400
    this.instantiate()
  }

  stopKvm = (): void => {
    this.redirector?.stop()
    this.keyboardHelper.UnGrabKeyInput()
    this.reset()
  }

  onMouseup(event: MouseEvent): void {
    if (this.mouseHelper != null) {
      this.mouseHelper.mouseup(event)
    }
  }

  onMousedown(event: MouseEvent): void {
    if (this.mouseHelper != null) {
      this.mouseHelper.mousedown(event)
    }
  }

  onMousemove(event: MouseEvent): void {
    if (this.mouseHelper != null) {
      this.mouseHelper.mousemove(event)
    }
  }

  ngOnDestroy(): void {
    this.stopKvm()
  }
}
