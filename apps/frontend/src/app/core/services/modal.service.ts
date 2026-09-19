import { Injectable, Type, ViewContainerRef, ComponentRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private viewContainerRef?: ViewContainerRef;
  private componentRef?: ComponentRef<any>;

  setContainer(vcr: ViewContainerRef) {
    this.viewContainerRef = vcr;
  }

  open<T>(component: Type<any>, dataInput?: T) {
    if (!this.viewContainerRef) {
      console.error('ModalService: ViewContainerRef not set. Add <app-modal-host> to app root.');
      return;
    }
    this.close();
    this.componentRef = this.viewContainerRef.createComponent(component);
    if (dataInput) {
      this.componentRef.setInput('dataInput', dataInput);
    }
    return this.componentRef;
  }

  close() {
    if (this.viewContainerRef) {
      this.viewContainerRef.clear();
    }
    this.componentRef = undefined;
  }
}
