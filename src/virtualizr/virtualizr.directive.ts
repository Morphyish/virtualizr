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
  ViewContainerRef
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
      this.virtualzrWrapper.onScroll.subscribe((firstIndex: number) => {
        this.onScroll(firstIndex);
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

    changes.forEachOperation(
      (item: IterableChangeRecord<any>, adjustedPreviousIndex: number, currentIndex: number) => {
        if (item.previousIndex == null) {
          this.virtualzrWrapper.nbOfElements++;

          if (this._viewContainer.length >= this.virtualzrWrapper.nbOfElementsDisplayed) {
            return;
          }
          const view = this._viewContainer.createEmbeddedView(this._template, new VirtForOfContext<T>(null !, this.virtForOf, -1, -1), currentIndex);
          const tuple = new VirtRecordViewTuple<T>(item, view);
          insertTuples.push(tuple);
        } else if (currentIndex == null) {
          this.virtualzrWrapper.nbOfElements--;

          this._viewContainer.remove(adjustedPreviousIndex);
        } else {
          const view = this._viewContainer.get(adjustedPreviousIndex) !;
          this._viewContainer.move(view, currentIndex);
          const tuple: VirtRecordViewTuple<T> = new VirtRecordViewTuple(item, view as EmbeddedViewRef<VirtForOfContext<T>>);
          insertTuples.push(tuple);
        }
      }
    );

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

  private onScroll(firstIndex: number): void {
    // avoid issues when user tries to autoscroll to an Index in the middle of displayed range (happens when near the end of the iterable)
    firstIndex = Math.min(firstIndex, this.virtualzrWrapper.nbOfElements - this.virtualzrWrapper.nbOfElementsDisplayed);

    const nbOfViews = this._viewContainer.length;
    let viewIndex = 0;
    for (; viewIndex < nbOfViews; viewIndex++) {
      if (!this.virtForOf.hasOwnProperty(firstIndex + viewIndex)) {
        continue;
      }
      const viewRef = this._viewContainer.get(viewIndex) as EmbeddedViewRef<VirtForOfContext<T>>;
      viewRef.context.$implicit = this.virtForOf[firstIndex + viewIndex];
    }

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
