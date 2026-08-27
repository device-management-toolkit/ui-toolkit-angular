import { ComponentFixture, TestBed } from '@angular/core/testing'
import { IDERComponent } from './ider.component'
import { AMTRedirector, AMTIDER } from '@device-management-toolkit/ui-toolkit/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('IderComponent', () => {
  let component: IDERComponent
  let fixture: ComponentFixture<IDERComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IDERComponent],
      providers: [
        {
          provide: 'userInput',
          useValue: {
            mpsServer: 'https://localhost/mps'
          }
        }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(IDERComponent)
    component = fixture.componentInstance

    // Initialize with deviceConnection = false to avoid triggering effect during setup
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()

    // Never let a spec open a real WebSocket to the MPS server.
    vi.spyOn(AMTRedirector.prototype, 'start').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should correctly instantiate redirector and ider', () => {
    fixture.componentRef.setInput('mpsServer', 'testServer')
    fixture.componentRef.setInput('authToken', 'testToken')
    fixture.componentRef.setInput('deviceId', 'testDeviceId')

    component.instantiate()

    expect(component.redirector).toBeTruthy()
    expect(component.ider).toBeTruthy()

    expect(component.ider).toBeInstanceOf(AMTIDER)
    expect(component.redirector).toBeInstanceOf(AMTRedirector)

    expect(component.redirector?.host).toEqual('testDeviceId')
    expect(component.redirector?.server).toEqual('testServer')
    expect(component.redirector?.authToken).toEqual('testToken')
  })

  it('should emit device status', () => {
    const emitSpy = vi.spyOn(component.deviceStatus, 'emit').mockImplementation(() => {})
    component.onConnectionStateChange(component.redirector, 1)
    expect(emitSpy).toHaveBeenCalledWith(1)
  })

  it('should call init when deviceConnection is true', () => {
    const initSpy = vi.spyOn(component, 'init').mockImplementation(() => {})
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()
    expect(initSpy).toHaveBeenCalled()
  })

  it('should call stopIder when deviceConnection is false', () => {
    // Stub init so it only instantiates: the real init() schedules a 4s setTimeout
    // that would call startIder() long after this spec has finished.
    vi.spyOn(component, 'init').mockImplementation(() => {
      component.instantiate()
    })
    const stopIderSpy = vi.spyOn(component, 'stopIder').mockImplementation(() => {})

    // First set deviceConnection to true to initialize
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()

    expect(component.redirector).toBeInstanceOf(AMTRedirector)

    // Then set deviceConnection to false
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()

    expect(stopIderSpy).toHaveBeenCalled()
  })

  it('should emit updated iderData', () => {
    const emitSpy = vi.spyOn(component.iderData, 'emit').mockImplementation(() => {})
    component.instantiate()
    component.iderSectorStats(1, 0, 0, 0, 2)
    expect(emitSpy).toHaveBeenCalled()
  })

  it('should stop ider', () => {
    const redirectorSpy = vi.spyOn(AMTRedirector.prototype, 'stop').mockImplementation(() => {})
    const cleanupSpy = vi.spyOn(component, 'cleanup').mockImplementation(() => {})
    component.instantiate()
    component.stopIder()

    expect(component.ider).not.toBeNull()
    expect(component.redirector).not.toBeNull()
    expect(redirectorSpy).toHaveBeenCalled()
    expect(cleanupSpy).toHaveBeenCalled()
  })

  it('should stop ider on destroy', () => {
    const stopSpy = vi.spyOn(AMTIDER.prototype, 'stop').mockImplementation(() => {})
    component.instantiate()
    component.ngOnDestroy()
    expect(stopSpy).toHaveBeenCalled()
  })

  it('should set null values to the core objects on cleanup', () => {
    component.cleanup()

    expect(component.redirector).toBeNull()
    expect(component.ider).toBeNull()
  })
})
