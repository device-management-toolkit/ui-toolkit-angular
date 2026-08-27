import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AMTRedirector, AmtTerminal } from '@device-management-toolkit/ui-toolkit/core'
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

  it('should stop the websocket and dispose terminal on sol stop', () => {
    setup()
    const redirectorSpy = vi.spyOn(AMTRedirector.prototype, 'stop').mockImplementation(() => {})
    const cleanupSpy = vi.spyOn(component, 'cleanup').mockImplementation(() => {})
    const handleClearTerminalSpy = vi.spyOn(component, 'handleClearTerminal').mockImplementation(() => {})
    const disposeSpy = vi.spyOn(Terminal.prototype, 'dispose').mockImplementation(() => {})
    component.stopSol()

    expect(component.redirector).not.toBeNull()
    expect(redirectorSpy).toHaveBeenCalled()
    expect(handleClearTerminalSpy).toHaveBeenCalled()
    expect(disposeSpy).toHaveBeenCalled()
    expect(cleanupSpy).toHaveBeenCalled()
  })

  it('should update the terminal state on terminal state change', () => {
    setup()
    const emitSpy = vi.spyOn(component.deviceStatus, 'emit').mockImplementation(() => {})
    const state = 0
    component.onTerminalStateChange(component.redirector, state)
    expect(emitSpy).toHaveBeenCalled()
    expect(component.deviceState).toEqual(state)
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
    const writeSpy = vi.spyOn(component.term, 'write').mockImplementation(() => {})

    const xtermString = 'serialOverLAN'
    component.handleWriteToXterm(xtermString)
    expect(writeSpy).toHaveBeenCalled()
  })

  it('should send the keypress event to the core function', () => {
    setup()
    const termSendKeysSpy = vi.spyOn(component.terminal, 'TermSendKeys').mockImplementation(() => {})

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
