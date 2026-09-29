import { debounceTime, Subject, Subscription } from 'rxjs';

export class DebounceEvent {
  $subject = new Subject<void>();
  private sub = new Subscription();

  constructor(debounceMs: number, callback: () => void) {
    this.sub.add(
      this.$subject.pipe(debounceTime(debounceMs)).subscribe(callback),
    );

    this.sub.add(this.sub)
  }

  emit() {
    this.$subject.next();
  }

  unsub() {
    this.sub.unsubscribe();
    this.$subject.complete();
  }
}
