import {
  ChangeDetectorRef,
  Directive,
  DoCheck,
  EmbeddedViewRef,
  Input,
  isDevMode,
  IterableChangeRecord,
  IterableChanges,
  IterableDiffer,
  IterableDiffers,
  NgIterable,
  OnChanges,
  Optional,
  SimpleChanges,
  TemplateRef,
  TrackByFunction,
  ViewContainerRef, ViewRef
} from '@angular/core';
import {VirtForOfContext} from './classes/virt-for-of-context.class';
import {VirtRecordViewTuple} from './classes/virt-record-view-tuple.class';
import {VirtualizrWrapper} from './virtualizr.component';

@Directive({
  selector: '[virtFor][virtForOf]',
})
export class VirtualizrDirective<T> implements DoCheck, OnChanges {
  @Input() public virtForOf: NgIterable<T>;

  @Input()
  public set virtForItemSize(value: number) {
    this.virtualzrWrapper.setElementSize(value);
  }

  @Input()
  public set virtForTrackBy(fn: TrackByFunction<T>) {
    if (isDevMode() && fn != null && typeof fn !== 'function') {
      if (<any>console && <any>console.warn) {
        console.warn(`trackBy must be a function, but received ${JSON.stringify(fn)}.`)
      }
    }
    this._trackByFn = fn;
  }

  public get virtForTrackBy(): TrackByFunction<T> {
    return this._trackByFn;
  }

  private _virtForOf: NgIterable<T>;
  private _differ: IterableDiffer<T> | null = null;
  private _trackByFn: TrackByFunction<T>;

  private currentFirstIndex: number = 0;
  private currentLastIndex: number = 0;
  private nextFrame: number;

  public constructor(private _viewContainer: ViewContainerRef,
                     private _template: TemplateRef<VirtForOfContext<T>>,
                     private _differs: IterableDiffers,
                     private ref: ChangeDetectorRef,
                     @Optional() public virtualzrWrapper: VirtualizrWrapper) {
    if (virtualzrWrapper == null) {
      throw new Error(
        'The directive virtForOf must always use the virtualizr component as an explicite wrapping container.'
      )
    } else {
      this.virtualzrWrapper.onScroll.subscribe((indexes: {firstIndex: number, lastIndex: number}) => {
        this.onScroll(indexes.firstIndex, indexes.lastIndex);
      });
    }
  }

  @Input()
  public set virtForTemplate(value: TemplateRef<VirtForOfContext<T>>) {
    if (value) {
      this._template = value;
    }
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if ('virtForOf' in changes) {
      const value: any = changes['virtForOf'].currentValue;

      if (!this._differ && value) {
        try {
          this._differ = this._differs.find(value).create(this.virtForTrackBy);
        } catch (e) {
          throw new Error(
            `Cannot find a differ supporting object '${value}' of type '${value['name'] || typeof value}'. VtaFor only supports binding to Iterables such as Arrays.`
          )
        }
      }
    }
  }

  public ngDoCheck(): void {
    if (this._differ) {
      const changes = this._differ.diff(this.virtForOf);
      if (changes) {
        this._applyChanges(changes);
      }
    }
  }

  private _applyChanges(changes: IterableChanges<T>): void {
    const insertTuples: VirtRecordViewTuple<T>[] = [];

    changes.forEachRemovedItem((item: IterableChangeRecord<any>) => {
      this.virtualzrWrapper.nbOfElements--;
      this._viewContainer.remove(item.previousIndex);
    });

    changes.forEachAddedItem((item: IterableChangeRecord<any>) => {
      this.virtualzrWrapper.nbOfElements++;

      if (this._viewContainer.length >= this.virtualzrWrapper.nbOfElementsDisplayed) {
        return;
      }
      const view = this._viewContainer.createEmbeddedView(this._template, new VirtForOfContext<T>(null !, this.virtForOf, -1, -1), item.currentIndex);
      const tuple = new VirtRecordViewTuple<T>(item, view);
      insertTuples.push(tuple);
    });

    changes.forEachMovedItem((item: IterableChangeRecord<any>) => {
      const viewPrevious: ViewRef | null = this._viewContainer.get(item.previousIndex);
      const viewCurrent: ViewRef | null = this._viewContainer.get(item.currentIndex);
      if (viewCurrent != null) {
        if (viewPrevious != null) {
          this._viewContainer.move(viewPrevious, item.currentIndex);
          const tuple: VirtRecordViewTuple<T> = new VirtRecordViewTuple(item, viewPrevious as EmbeddedViewRef<VirtForOfContext<T>>);
          insertTuples.push(tuple);
        } else {
          const tuple: VirtRecordViewTuple<T> = new VirtRecordViewTuple(item, viewCurrent as EmbeddedViewRef<VirtForOfContext<T>>);
          insertTuples.push(tuple);
        }
      }
    });

    [this.currentFirstIndex, this.currentLastIndex] = this.virtualzrWrapper.updateIndexes();

    let i = 0;
    const tuplesLength = insertTuples.length;
    for (; i < tuplesLength; i++) {
      this._perViewChange(insertTuples[i].view, insertTuples[i].record);
    }

    let j = 0;
    const viewLength = this._viewContainer.length;
    for (; j < viewLength; j++) {
      const viewRef = this._viewContainer.get(j) as EmbeddedViewRef<VirtForOfContext<T>>;
      viewRef.context.index = j;
      viewRef.context.count = viewLength;
    }

    changes.forEachIdentityChange((record: any) => {
      const viewRef = this._viewContainer.get(record.currentIndex) as EmbeddedViewRef<VirtForOfContext<T>>;
      viewRef.context.$implicit = record.item;
    });
  }

  private onScroll(firstIndex: number, lastIndex: number): void {
    const insertTuples: VirtRecordViewTuple<T>[] = [];

    console.log(this._viewContainer.length);

    // todo: verify indexes when creating new views. probably an issue.
    // todo: array start at position 2 (probably something funky with the buffers during the initialization phase ?)

    if (firstIndex > this.currentFirstIndex) {
      for (let i: number = 0; i < firstIndex - this.currentFirstIndex; i++) {
        this._viewContainer.remove(i);
      }
    } else {
      for (let i:number = 0; i < this.currentFirstIndex - firstIndex; i++) {
        const view = this._viewContainer.createEmbeddedView(this._template, new VirtForOfContext<T>(null !, this.virtForOf, -1, -1), i);
        const tuple = new VirtRecordViewTuple<T>(this.virtForOf[i + firstIndex], view);
        insertTuples.push(tuple);
      }
    }

    if (lastIndex < this.currentLastIndex) {
      for (let i: number = 0; i < this.currentLastIndex - lastIndex; i++) {
        this._viewContainer.remove(i);
      }
    } else {
      for (let i: number = 0; i < lastIndex - this.currentLastIndex; i++) {
        const view = this._viewContainer.createEmbeddedView(this._template, new VirtForOfContext<T>(null !, this.virtForOf, -1, -1), i);
        const tuple = new VirtRecordViewTuple<T>(this.virtForOf[i + this.currentLastIndex], view);
        insertTuples.push(tuple);
      }
    }

    let i = 0;
    const tuplesLength = insertTuples.length;
    for (; i < tuplesLength; i++) {
      this._perViewChange(insertTuples[i].view, insertTuples[i].record);
    }

    let j = 0;
    const viewLength = this._viewContainer.length;
    for (; j < viewLength; j++) {
      const viewRef = this._viewContainer.get(j) as EmbeddedViewRef<VirtForOfContext<T>>;
      viewRef.context.index = j + firstIndex;
      viewRef.context.count = viewLength;
    }

    console.log(this._viewContainer.length);

    this.currentFirstIndex = firstIndex;
    this.currentLastIndex = lastIndex;

    if (this.nextFrame) {
      cancelAnimationFrame(this.nextFrame);
    }
    this.nextFrame = requestAnimationFrame(this.forceDetection.bind(this));
  }

  private forceDetection(): void {
    delete this.nextFrame;
    this.ref.detectChanges();
  }

  private _perViewChange(view: EmbeddedViewRef<VirtForOfContext<T>>, record: IterableChangeRecord<any>): void {
    view.context.$implicit = record.item;
  }
}
