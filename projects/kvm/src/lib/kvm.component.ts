import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
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
} from '@open-amt-cloud-toolkit/ui-toolkit/core'
import { fromEvent, timer } from 'rxjs'
import { throttleTime } from 'rxjs/operators'

@Component({
  selector: 'amt-kvm',
  templateUrl: './kvm.component.html',
  styleUrls: ['./kvm.component.css']
})
export class KvmComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvas: ElementRef | undefined
  @ViewChild('device', { static: false }) device: string
  public context!: CanvasRenderingContext2D

  // //setting a width and height for the canvas

  @Input() public width = 400
  @Input() public height = 400
  @Input() public mpsServer = ''
  @Input() public authToken = ''
  @Input() public deviceId = ''

  @Output() deviceStatus: EventEmitter<number> = new EventEmitter<number>()
  @Input() deviceConnection: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Input() selectedEncoding: EventEmitter<number> = new EventEmitter<number>()
  module: any
  redirector: any
  dataProcessor!: IDataProcessor | null
  mouseHelper!: MouseHelper
  keyboardHelper!: KeyBoardHelper
  powerState: any = 0
  selected = 1
  timeInterval!: any
  mouseMove: any = null
  encodings = [
    { value: 1, viewValue: 'RLE 8' },
    { value: 2, viewValue: 'RLE 16' }
  ]

  ngOnInit (): void {
    this.deviceConnection.subscribe((data: boolean) => {
      if (data) {
        this.init()
      } else {
        this.stopKvm()
      }
    })
    this.selectedEncoding.subscribe((data) => {
      this.selected = data
      this.onEncodingChange()
    })
  }

  ngAfterViewInit (): void {
    this.init()
  }

  instantiate (): void {
    this.context = this.canvas?.nativeElement.getContext('2d')
    const config: RedirectorConfig = {
      protocol: Protocol.KVM,
      fr: new FileReader(),
      host: this.deviceId,
      port: 16994,
      user: '',
      pass: '',
      tls: 0,
      tls1only: 0,
      authToken: this.authToken,
      server: this.mpsServer
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
    this.mouseMove = fromEvent(this.canvas?.nativeElement, 'mousemove')
    this.mouseMove.pipe(throttleTime(200)).subscribe((event: any) => {
      if (this.mouseHelper != null) {
        this.mouseHelper.mousemove(event)
      }
    })
  }

  onConnectionStateChange = (redirector: any, state: number): any => {
    this.deviceStatus.emit(state)
  }

  onRedirectorError (): void {
    this.reset()
  }

  init (): void {
    this.instantiate()
    setTimeout(() => {
      this.autoConnect()
    }, 4000)
  }

  autoConnect (): void {
    if (this.redirector != null) {
      this.redirector.start(WebSocket)
      this.keyboardHelper.GrabKeyInput()
    }
  }

  onEncodingChange (): void {
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
    this.redirector.stop()
    this.keyboardHelper.UnGrabKeyInput()
    this.reset()
  }

  onMouseup (event: MouseEvent): void {
    if (this.mouseHelper != null) {
      this.mouseHelper.mouseup(event)
    }
  }

  onMousedown (event: MouseEvent): void {
    if (this.mouseHelper != null) {
      this.mouseHelper.mousedown(event)
    }
  }

  onMousemove (event: MouseEvent): void {
    if (this.mouseHelper != null) {
      this.mouseHelper.mousemove(event)
    }
  }

  ngOnDestroy (): void {
    this.stopKvm()
  }
}
