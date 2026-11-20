import { ComponentFixture, TestBed } from '@angular/core/testing'
import {
  AMTRedirector,
  AmtTerminal,
  SolTerminalType,
  TerminalDataProcessor
} from '@device-management-toolkit/ui-toolkit/core'
import { Terminal } from '@xterm/xterm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SOLComponent } from './sol.component'

describe('SolComponent', () => {
  let component: SOLComponent
  let fixture: ComponentFixture<SOLComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SOLComponent],
      providers: [
        {
          provide: 'userInput',
          useValue: {
            mpsServer: 'https://localhost/mps'
          }
        }
      ]
    }).compileComponents()

    // Prevent the component from opening a real WebSocket to wss://localhost when
    // deviceConnection is set to true (startSol -> redirector.start(WebSocket)).
    vi.spyOn(AMTRedirector.prototype, 'start').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const setup = (): void => {
    fixture = TestBed.createComponent(SOLComponent)
    component = fixture.componentInstance
    // Set inputs first
    fixture.componentRef.setInput('mpsServer', 'wss://localhost')
    fixture.componentRef.setInput('authToken', 'testToken')
    fixture.componentRef.setInput('deviceId', 'testDevice')
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()

    // Now enable connection to trigger instantiate and start
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()
  }

  const asyncSetup = (): void => {
    fixture = TestBed.createComponent(SOLComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('mpsServer', 'wss://localhost')
    fixture.componentRef.setInput('authToken', 'authToken')
    fixture.componentRef.setInput('deviceId', 'testDevice')
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()

    // Enable connection to trigger instantiate and start
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()
  }

  it('should create', () => {
    setup()
    expect(component).toBeTruthy()
    expect(component.terminal).toBeInstanceOf(AmtTerminal)
    expect(component.term).toBeInstanceOf(Terminal)
    expect(component.redirector).toBeInstanceOf(AMTRedirector)
  })

  it('should default to PCANSI and initialize the processor with the selected terminal type', () => {
    const setTerminalTypeSpy = vi.spyOn(TerminalDataProcessor.prototype, 'setTerminalType')
    setup()

    expect(component.terminalType()).toBe(SolTerminalType.PCANSI)
    expect(setTerminalTypeSpy).toHaveBeenCalledWith(SolTerminalType.PCANSI)
  })

  it('should apply terminal type changes before connection, while connected, and after reconnecting', () => {
    fixture = TestBed.createComponent(SOLComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('terminalType', SolTerminalType.VTUTF8)
    fixture.detectChanges()

    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()
    expect(component.dataProcessor?.terminalType).toBe(SolTerminalType.VTUTF8)

    fixture.componentRef.setInput('terminalType', SolTerminalType.PCANSI)
    fixture.detectChanges()
    expect(component.dataProcessor?.terminalType).toBe(SolTerminalType.PCANSI)

    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()
    fixture.componentRef.setInput('terminalType', SolTerminalType.VTUTF8)
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()
    expect(component.dataProcessor?.terminalType).toBe(SolTerminalType.VTUTF8)
  })

  it('should reset the processor when the component is destroyed', () => {
    setup()
    const resetSpy = vi.spyOn(component.dataProcessor!, 'reset')
    fixture.destroy()
    expect(resetSpy).toHaveBeenCalledOnce()
  })

  it('should reset the processor on disconnect', () => {
    setup()
    const resetSpy = vi.spyOn(component.dataProcessor!, 'reset')
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()
    expect(resetSpy).toHaveBeenCalledOnce()
  })

  it('should reset the processor when the redirector drops unexpectedly', () => {
    setup()
    const redirector = component.redirector!
    const resetSpy = vi.spyOn(component.dataProcessor!, 'reset')
    const stopSpy = vi.spyOn(redirector, 'stop')

    redirector.onStateChanged!(redirector, 0)

    expect(resetSpy).toHaveBeenCalledOnce()
    expect(stopSpy).not.toHaveBeenCalled()
    expect(component.redirector).toBe(redirector)
    expect(component.deviceState()).toBe(0)
  })

  it('should discard partial UTF-8 data when changing terminal type', () => {
    setup()
    fixture.componentRef.setInput('terminalType', SolTerminalType.VTUTF8)
    fixture.detectChanges()
    const writeSpy = vi.spyOn(component.term!, 'write').mockImplementation(() => {})
    component.redirector!.onProcessData!('\xc3')

    fixture.componentRef.setInput('terminalType', SolTerminalType.PCANSI)
    fixture.detectChanges()
    fixture.componentRef.setInput('terminalType', SolTerminalType.VTUTF8)
    fixture.detectChanges()
    component.redirector!.onProcessData!('\xa9')

    expect(writeSpy).toHaveBeenLastCalledWith('\ufffd')
  })

  it('should stop the websocket and dispose terminal on sol stop', () => {
    setup()
    const redirectorSpy = vi.spyOn(AMTRedirector.prototype, 'stop')
    const cleanupSpy = vi.spyOn(component, 'cleanup').mockImplementation(() => {})
    const resetSpy = vi.spyOn(Terminal.prototype, 'reset')
    const disposeSpy = vi.spyOn(Terminal.prototype, 'dispose').mockImplementation(() => {})
    component.stopSol()

    expect(component.redirector).not.toBeNull()
    expect(redirectorSpy).toHaveBeenCalled()
    expect(resetSpy).toHaveBeenCalled()
    expect(disposeSpy).toHaveBeenCalled()
    expect(cleanupSpy).toHaveBeenCalled()
  })

  it('should update the terminal state on terminal state change', () => {
    setup()
    const emitSpy = vi.spyOn(component.deviceStatus, 'emit').mockImplementation(() => {})
    const state = 0
    component.onTerminalStateChange(component.redirector!, state)
    expect(emitSpy).toHaveBeenCalled()
    expect(component.deviceState()).toEqual(state)
  })

  it('should render the terminal once the device is connected', () => {
    setup()
    expect(fixture.nativeElement.querySelector('amt-terminal')).toBeNull()

    component.onTerminalStateChange(component.redirector!, 3)
    fixture.detectChanges()

    expect(fixture.nativeElement.querySelector('amt-terminal')).not.toBeNull()
  })

  it('should set null values to the core objects on cleanup', () => {
    setup()
    component.cleanup()

    expect(component.redirector).toBeNull()
    expect(component.dataProcessor).toBeNull()
    expect(component.terminal).toBeNull()
    expect(component.term).toBeNull()
  })

  it('should write the string to xterm on write function is called', () => {
    setup()
    const writeSpy = vi.spyOn(component.term!, 'write').mockImplementation(() => {})

    const xtermString = 'serialOverLAN'
    component.handleWriteToXterm(xtermString)
    expect(writeSpy).toHaveBeenCalled()
  })

  it('should send the keypress event to the core function', () => {
    setup()
    const termSendKeysSpy = vi.spyOn(component.terminal!, 'TermSendKeys').mockImplementation(() => {})

    const domEvent = {
      code: 'A'
    }
    component.handleKeyPress(domEvent)
    expect(termSendKeysSpy).toHaveBeenCalled()
  })

  it('should instantiate redirector when deviceConnection becomes true', () => {
    asyncSetup()
    expect(component.redirector).not.toBeNull()
    expect(component.mpsServer()).toEqual('wss://localhost')
    expect(component.authToken()).toEqual('authToken')
    expect(component.deviceId()).toEqual('testDevice')
  })

  it('should call startSol when deviceConnection becomes true', () => {
    fixture = TestBed.createComponent(SOLComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('mpsServer', 'wss://localhost')
    fixture.componentRef.setInput('authToken', 'testToken')
    fixture.componentRef.setInput('deviceId', 'testDevice')
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()

    const startSolSpy = vi.spyOn(component, 'startSol').mockImplementation(() => {})

    // Enable connection to trigger effect
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()

    expect(startSolSpy).toHaveBeenCalled()
  })

  it('should call stopSol when deviceConnection becomes false', () => {
    setup() // This sets deviceConnection to true and creates redirector

    const stopSolSpy = vi.spyOn(component, 'stopSol').mockImplementation(() => {})

    // Disable connection to trigger effect
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()

    expect(stopSolSpy).toHaveBeenCalled()
  })
})
