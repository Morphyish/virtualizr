import {NgIterable} from '@angular/core';

export class VirtForOfContext<T> {
  public constructor(public $implicit: T,
                     public virtForOf: NgIterable<T>,
                     public index: number,
                     public count: number) {
  }

  public get first(): boolean {
    return this.index === 0;
  }

  public get last(): boolean {
    return this.index === this.count - 1;
  }

  public get even(): boolean {
    return this.index % 2 === 0;
  }

  public get odd(): boolean {
    return !this.even;
  }
}
