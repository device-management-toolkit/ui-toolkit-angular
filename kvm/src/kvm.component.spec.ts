/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing'
import { input } from '@angular/core'

import { KVMComponent } from './kvm.component'
import {
  AMTDesktop,
  AMTRedirector,
  DataProcessor,
  KeyBoardHelper,
  MouseHelper
} from '@device-management-toolkit/ui-toolkit/core'

describe('KvmComponent', () => {
  let component: KVMComponent
  let fixture: ComponentFixture<KVMComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KVMComponent]
    }).compileComponents()
  })

  const setup = (): void => {
    fixture = TestBed.createComponent(KVMComponent)
    component = fixture.componentInstance
    // Set initial inputs via setInput to prevent effect from triggering during setup
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.componentRef.setInput('mpsServer', '')
    fixture.componentRef.setInput('authToken', 'authToken')
    fixture.componentRef.setInput('deviceId', '')
    fixture.detectChanges()

    // Now enable connection to trigger init
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()
  }

  const asyncSetup = fakeAsync(() => {
    fixture = TestBed.createComponent(KVMComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.componentRef.setInput('mpsServer', 'wss://localhost')
    fixture.componentRef.setInput('authToken', 'authToken')
    fixture.detectChanges()

    fixture.componentRef.setInput('deviceConnection', true) // Enable connection to trigger init
    fixture.detectChanges()
    tick(4500)
    fixture.detectChanges()
    flush()
  })

  it('should create', () => {
    setup()
    expect(component).toBeTruthy()
    expect(component.redirector).toBeInstanceOf(AMTRedirector)
    expect(component.module).toBeInstanceOf(AMTDesktop)
    expect(component.mouseHelper).toBeInstanceOf(MouseHelper)
    expect(component.keyboardHelper).toBeInstanceOf(KeyBoardHelper)
    expect(component.dataProcessor).toBeInstanceOf(DataProcessor)
    expect(component.selected()).toEqual(1)
    expect(component.encodings.length).toEqual(2)
    expect(component.mpsServer()).toBe('')
    expect(component.deviceId()).toBe('')
    expect(component.authToken()).toBe('authToken')
  })

  it('should autoconnect on pageload', () => {
    asyncSetup()
    spyOn<any>(component.redirector, 'start')
    spyOn(component.keyboardHelper!, 'GrabKeyInput')
    expect(component.redirector).not.toBeNull()
    expect(component.mpsServer()).toEqual('wss://localhost')
    expect(component.authToken()).toEqual('authToken')
  })

  it('should reset all the objects once kvm is stopped', () => {
    setup()
    spyOn<any>(component.redirector, 'stop')
    spyOn(component.keyboardHelper!, 'UnGrabKeyInput')
    const resetSpy = spyOn(component, 'reset')
    component.stopKvm()
    expect(component.redirector?.stop).toHaveBeenCalled()
    expect(component.keyboardHelper!.UnGrabKeyInput).toHaveBeenCalled()
    expect(resetSpy).toHaveBeenCalled()
  })

  it('should disconnect and reconnect on encoding change (including delayed autoConnect)', fakeAsync(() => {
    setup()
    const stopKvmSpy = spyOn(component, 'stopKvm')
    const autoConnectSpy = spyOn(component, 'autoConnect')

    // First set deviceConnection to true and ensure component is connected
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()
    tick()

    // Then change the encoding
    fixture.componentRef.setInput('selectedEncoding', 2) // Change from default 1 to 2
    fixture.detectChanges()
    // Wait for onEncodingChange timer (1s) + init's autoConnect delay (4s)
    tick(5100)

    expect(component.selected()).toEqual(2)
    expect(stopKvmSpy).toHaveBeenCalled()
    expect(autoConnectSpy).toHaveBeenCalled()
    flush()
  }))

  it('should reset and re-instantiate the core objects on error', () => {
    setup()
    const resetSpy = spyOn(component, 'reset')
    component.onRedirectorError()

    expect(resetSpy).toHaveBeenCalled()
  })

  it('should trigger the core components method on mouse interactions', () => {
    setup()
    spyOn(component.mouseHelper!, 'mousedown')
    spyOn(component.mouseHelper!, 'mouseup')
    spyOn(component.mouseHelper!, 'mousemove')

    const event: any = {
      button: 1,
      pageX: 100,
      pageY: 211
    }
    component.onMousedown(event as MouseEvent)
    expect(component.mouseHelper).not.toBeNull()
    expect(component.mouseHelper!.mousedown).toHaveBeenCalled()

    component.onMouseup(event as MouseEvent)
    expect(component.mouseHelper).not.toBeNull()
    expect(component.mouseHelper!.mouseup).toHaveBeenCalled()

    component.onMousemove(event as MouseEvent)
    expect(component.mouseHelper).not.toBeNull()
    expect(component.mouseHelper!.mousemove).toHaveBeenCalled()
  })

  describe('sendHotkey', () => {
    it('should not send hotkey when keyboard helper is not available', () => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      component.keyboardHelper = null
      const consoleWarnSpy = spyOn(console, 'warn')

      component.sendHotkey('ctrl-alt-del')

      expect(consoleWarnSpy).toHaveBeenCalledWith('KVMComponent: Cannot send hotkey - keyboard helper not available')
    })

    it('should send ctrl-alt-del hotkey sequence', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('ctrl-alt-del')
      tick(100) // Wait for all key sequences

      expect(handleKeyEventSpy).toHaveBeenCalledTimes(6)
      // Verify the sequence: Ctrl down, Alt down, Del down, Del up, Alt up, Ctrl up
      expect(handleKeyEventSpy.calls.argsFor(0)[0]).toBe(1) // Ctrl down
      expect(handleKeyEventSpy.calls.argsFor(1)[0]).toBe(1) // Alt down
      expect(handleKeyEventSpy.calls.argsFor(2)[0]).toBe(1) // Del down
      expect(handleKeyEventSpy.calls.argsFor(3)[0]).toBe(0) // Del up
      expect(handleKeyEventSpy.calls.argsFor(4)[0]).toBe(0) // Alt up
      expect(handleKeyEventSpy.calls.argsFor(5)[0]).toBe(0) // Ctrl up
      flush()
    }))

    it('should send alt-f4 hotkey sequence', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('alt-f4')
      tick(100)

      expect(handleKeyEventSpy).toHaveBeenCalledTimes(4)
      // Verify the sequence: Alt down, F4 down, F4 up, Alt up
      expect(handleKeyEventSpy.calls.argsFor(0)[0]).toBe(1) // Alt down
      expect(handleKeyEventSpy.calls.argsFor(1)[0]).toBe(1) // F4 down
      expect(handleKeyEventSpy.calls.argsFor(2)[0]).toBe(0) // F4 up
      expect(handleKeyEventSpy.calls.argsFor(3)[0]).toBe(0) // Alt up
      flush()
    }))

    it('should send windows key hotkey sequence', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('windows')
      tick(100)

      expect(handleKeyEventSpy).toHaveBeenCalledTimes(2)
      // Verify the sequence: Windows down, Windows up
      expect(handleKeyEventSpy.calls.argsFor(0)[0]).toBe(1) // Windows down
      expect(handleKeyEventSpy.calls.argsFor(1)[0]).toBe(0) // Windows up
      flush()
    }))

    it('should handle unknown hotkey type gracefully', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('unknown-hotkey')
      tick(100)

      expect(handleKeyEventSpy).not.toHaveBeenCalled()
      flush()
    }))
  })

  describe('Alt+Fn hotkeys', () => {
    it('should send alt-f1 hotkey sequence', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('alt-f1')
      tick(100)

      expect(handleKeyEventSpy).toHaveBeenCalledTimes(4)
      // Verify key codes: Alt down, F1 down, F1 up, Alt up
      expect(handleKeyEventSpy.calls.argsFor(0)[1].keyCode).toBe(0xffe9) // Alt
      expect(handleKeyEventSpy.calls.argsFor(1)[1].keyCode).toBe(0xffbe) // F1
      flush()
    }))

    it('should send alt-f6 hotkey sequence', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('alt-f6')
      tick(100)

      expect(handleKeyEventSpy).toHaveBeenCalledTimes(4)
      // Verify F6 key code
      expect(handleKeyEventSpy.calls.argsFor(1)[1].keyCode).toBe(0xffc3) // F6
      flush()
    }))

    it('should send alt-f12 hotkey sequence', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('alt-f12')
      tick(100)

      expect(handleKeyEventSpy).toHaveBeenCalledTimes(4)
      // Verify F12 key code
      expect(handleKeyEventSpy.calls.argsFor(1)[1].keyCode).toBe(0xffc9) // F12
      flush()
    }))
  })

  describe('Ctrl+Alt+Fn hotkeys', () => {
    it('should send ctrl-alt-f1 hotkey sequence', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('ctrl-alt-f1')
      tick(100)

      expect(handleKeyEventSpy).toHaveBeenCalledTimes(6)
      // Verify the sequence: Ctrl down, Alt down, F1 down, F1 up, Alt up, Ctrl up
      expect(handleKeyEventSpy.calls.argsFor(0)[0]).toBe(1) // Ctrl down
      expect(handleKeyEventSpy.calls.argsFor(0)[1].keyCode).toBe(0xffe3) // Ctrl
      expect(handleKeyEventSpy.calls.argsFor(1)[0]).toBe(1) // Alt down
      expect(handleKeyEventSpy.calls.argsFor(1)[1].keyCode).toBe(0xffe9) // Alt
      expect(handleKeyEventSpy.calls.argsFor(2)[1].keyCode).toBe(0xffbe) // F1
      flush()
    }))

    it('should send ctrl-alt-f7 hotkey sequence', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('ctrl-alt-f7')
      tick(100)

      expect(handleKeyEventSpy).toHaveBeenCalledTimes(6)
      // Verify F7 key code
      expect(handleKeyEventSpy.calls.argsFor(2)[1].keyCode).toBe(0xffc4) // F7
      flush()
    }))

    it('should send ctrl-alt-f12 hotkey sequence', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const handleKeyEventSpy = spyOn(component.keyboardHelper!, 'handleKeyEvent')

      component.sendHotkey('ctrl-alt-f12')
      tick(100)

      expect(handleKeyEventSpy).toHaveBeenCalledTimes(6)
      // Verify F12 key code
      expect(handleKeyEventSpy.calls.argsFor(2)[1].keyCode).toBe(0xffc9) // F12
      flush()
    }))
  })

  describe('buildFunctionKeySequence', () => {
    it('should return null for invalid function key numbers', () => {
      setup()
      const result0 = component['buildFunctionKeySequence'](0, false)
      const result13 = component['buildFunctionKeySequence'](13, false)
      const resultNegative = component['buildFunctionKeySequence'](-1, false)

      expect(result0).toBeNull()
      expect(result13).toBeNull()
      expect(resultNegative).toBeNull()
    })

    it('should generate correct key sequence for alt-f1', () => {
      setup()
      const result = component['buildFunctionKeySequence'](1, false)

      expect(result).not.toBeNull()
      expect(result!.keys.length).toBe(4)
      expect(result!.keys[0]).toEqual({ code: 0xffe9, down: true }) // Alt down
      expect(result!.keys[1]).toEqual({ code: 0xffbe, down: true }) // F1 down
      expect(result!.keys[2]).toEqual({ code: 0xffbe, down: false }) // F1 up
      expect(result!.keys[3]).toEqual({ code: 0xffe9, down: false }) // Alt up
    })

    it('should generate correct key sequence for ctrl-alt-f5', () => {
      setup()
      const result = component['buildFunctionKeySequence'](5, true)

      expect(result).not.toBeNull()
      expect(result!.keys.length).toBe(6)
      expect(result!.keys[0]).toEqual({ code: 0xffe3, down: true }) // Ctrl down
      expect(result!.keys[1]).toEqual({ code: 0xffe9, down: true }) // Alt down
      expect(result!.keys[2]).toEqual({ code: 0xffc2, down: true }) // F5 down
      expect(result!.keys[3]).toEqual({ code: 0xffc2, down: false }) // F5 up
      expect(result!.keys[4]).toEqual({ code: 0xffe9, down: false }) // Alt up
      expect(result!.keys[5]).toEqual({ code: 0xffe3, down: false }) // Ctrl up
    })

    it('should calculate correct key codes for all function keys', () => {
      setup()
      const expectedKeyCodes = [
        0xffbe,
        0xffbf,
        0xffc0,
        0xffc1, // F1-F4
        0xffc2,
        0xffc3,
        0xffc4,
        0xffc5, // F5-F8
        0xffc6,
        0xffc7,
        0xffc8,
        0xffc9 // F9-F12
      ]

      for (let i = 1; i <= 12; i++) {
        const result = component['buildFunctionKeySequence'](i, false)
        expect(result).not.toBeNull()
        expect(result!.keys[1].code).toBe(expectedKeyCodes[i - 1])
      }
    })
  })

  describe('hotkey input changes', () => {
    it('should trigger sendHotkey when selectedHotkey input changes', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const sendHotkeySpy = spyOn(component, 'sendHotkey')

      fixture.componentRef.setInput('deviceConnection', true)
      fixture.detectChanges()
      tick()

      fixture.componentRef.setInput('selectedHotkey', 'alt-f4')
      fixture.detectChanges()
      tick()

      expect(sendHotkeySpy).toHaveBeenCalledWith('alt-f4')
      flush()
    }))

    it('should not send hotkey when device is not connected', fakeAsync(() => {
      setup()
      spyOn<any>(component, 'autoConnect') // Prevent WebSocket connection
      const sendHotkeySpy = spyOn(component, 'sendHotkey')

      fixture.componentRef.setInput('deviceConnection', false)
      fixture.detectChanges()
      tick()

      fixture.componentRef.setInput('selectedHotkey', 'alt-f4')
      fixture.detectChanges()
      tick()

      expect(sendHotkeySpy).not.toHaveBeenCalled()
      flush()
    }))
  })
})
