import { Component, ViewChild, ViewContainerRef, inject, AfterViewInit } from '@angular/core';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-modal-host',
  standalone: true,
  template: `<ng-template #modalContainer></ng-template>`
})
export class ModalHostComponent implements AfterViewInit {
  @ViewChild('modalContainer', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  private modalService = inject(ModalService);

  ngAfterViewInit() {
    this.modalService.setContainer(this.viewContainerRef);
  }
}
