import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing'
import { AMTRedirector, AmtTerminal } from '@device-management-toolkit/ui-toolkit/core'
import { Terminal } from '@xterm/xterm'

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
    const redirectorSpy = spyOn(AMTRedirector.prototype, 'stop')
    const cleanupSpy = spyOn(component, 'cleanup')
    const handleClearTerminalSpy = spyOn(component, 'handleClearTerminal')
    const disposeSpy = spyOn(Terminal.prototype, 'dispose')
    component.stopSol()

    expect(component.redirector).not.toBeNull()
    expect(redirectorSpy).toHaveBeenCalled()
    expect(handleClearTerminalSpy).toHaveBeenCalled()
    expect(disposeSpy).toHaveBeenCalled()
    expect(cleanupSpy).toHaveBeenCalled()
  })

  it('should update the terminal state on terminal state change', () => {
    setup()
    spyOn(component.deviceStatus, 'emit')
    const state = 0
    component.onTerminalStateChange(component.redirector, state)
    expect(component.deviceStatus.emit).toHaveBeenCalled()
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
    spyOn(component.term, 'write')

    const xtermString = 'serialOverLAN'
    component.handleWriteToXterm(xtermString)
    expect(component.term.write).toHaveBeenCalled()
  })

  it('should send the keypress event to the core function', () => {
    setup()
    spyOn(component.terminal, 'TermSendKeys')

    const domEvent = {
      code: 'A'
    }
    component.handleKeyPress(domEvent)
    expect(component.terminal.TermSendKeys).toHaveBeenCalled()
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

    spyOn(component, 'startSol')

    // Enable connection to trigger effect
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()

    expect(component.startSol).toHaveBeenCalled()
  })

  it('should call stopSol when deviceConnection becomes false', () => {
    setup() // This sets deviceConnection to true and creates redirector

    spyOn(component, 'stopSol')

    // Disable connection to trigger effect
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()

    expect(component.stopSol).toHaveBeenCalled()
  })
})
