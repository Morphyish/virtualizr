import {EmbeddedViewRef} from '@angular/core';
import {VirtForOfContext} from './virt-for-of-context.class';

export class VirtRecordViewTuple<T> {
  public constructor(public record: any,
                     public view: EmbeddedViewRef<VirtForOfContext<T>>) {
  }
}
