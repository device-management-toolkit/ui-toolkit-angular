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
})
