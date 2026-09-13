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

  open(component: Type<any>) {
    if (!this.viewContainerRef) {
      console.error('ModalService: ViewContainerRef not set. Add <app-modal-host> to app root.');
      return;
    }
    this.close();
    this.componentRef = this.viewContainerRef.createComponent(component);
    return this.componentRef;
  }

  close() {
    if (this.viewContainerRef) {
      this.viewContainerRef.clear();
    }
    this.componentRef = undefined;
  }
}
