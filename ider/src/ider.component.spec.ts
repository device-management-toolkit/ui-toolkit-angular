import { ComponentFixture, TestBed } from '@angular/core/testing'
import { IDERComponent } from './ider.component'
import { AMTRedirector, AMTIDER } from '@device-management-toolkit/ui-toolkit/core'

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
    spyOn(component.deviceStatus, 'emit')
    component.onConnectionStateChange(component.redirector, 1)
    expect(component.deviceStatus.emit).toHaveBeenCalledWith(1)
  })

  it('should call init when deviceConnection is true', () => {
    spyOn(component, 'init')
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()
    expect(component.init).toHaveBeenCalled()
  })

  it('should call stopIder when deviceConnection is false', () => {
    spyOn(component, 'stopIder')

    // First set deviceConnection to true to initialize
    fixture.componentRef.setInput('deviceConnection', true)
    fixture.detectChanges()

    // Set up a mock redirector so the effect will call stopIder
    component.redirector = {} as any

    // Then set deviceConnection to false
    fixture.componentRef.setInput('deviceConnection', false)
    fixture.detectChanges()

    expect(component.stopIder).toHaveBeenCalled()
  })

  it('should emit updated iderData', () => {
    spyOn(component.iderData, 'emit')
    component.instantiate()
    component.iderSectorStats(1, 0, 0, 0, 2)
    expect(component.iderData.emit).toHaveBeenCalled()
  })

  it('should stop ider', () => {
    const redirectorSpy = spyOn(AMTRedirector.prototype, 'stop')
    const cleanupSpy = spyOn(component, 'cleanup')
    component.instantiate()
    component.stopIder()

    expect(component.ider).not.toBeNull()
    expect(component.redirector).not.toBeNull()
    expect(redirectorSpy).toHaveBeenCalled()
    expect(cleanupSpy).toHaveBeenCalled()
  })

  it('should stop ider on destroy', () => {
    const stopSpy = spyOn(AMTIDER.prototype, 'stop')
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
