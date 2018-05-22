import {
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
  ViewContainerRef,
  ViewRef
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

  public constructor(private _viewContainer: ViewContainerRef,
                     private _template: TemplateRef<VirtForOfContext<T>>,
                     private _differs: IterableDiffers,
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
      const changes: IterableChanges<T> | null = this._differ.diff(this.virtForOf);
      if (changes) {
        this._applyChanges(changes);
      }
    }
  }

  private _applyChanges(changes: IterableChanges<T>): void {
    const insertTuples: VirtRecordViewTuple<T>[] = [];

    let totalIterableSize: number = 0;
    changes.forEachOperation(
      (item: IterableChangeRecord<any>, adjustedPreviousIndex: number, currentIndex: number) => {
        if (currentIndex != null) {
          totalIterableSize++;
        }
        if (item.previousIndex == null) {
          if (this._viewContainer.length >= this.virtualzrWrapper.nbOfElementsDisplayed) {
            return;
          }
          const view: EmbeddedViewRef<VirtForOfContext<T>> = this._viewContainer.createEmbeddedView(this._template, new VirtForOfContext<T>(null !, this.virtForOf, -1, -1), currentIndex);
          const tuple: VirtRecordViewTuple<T> = new VirtRecordViewTuple<T>(item, view);
          insertTuples.push(tuple);
        } else if (currentIndex == null) {
          this._viewContainer.remove(adjustedPreviousIndex);
        } else {
          const view: ViewRef = this._viewContainer.get(adjustedPreviousIndex) !;
          this._viewContainer.move(view, currentIndex);
          const tuple: VirtRecordViewTuple<T> = new VirtRecordViewTuple(item, view as EmbeddedViewRef<VirtForOfContext<T>>);
          insertTuples.push(tuple);
        }
      }
    );
    this.virtualzrWrapper.nbOfElements = totalIterableSize;

    let i: number = 0;
    const tuplesLength: number = insertTuples.length;
    for (; i < tuplesLength; i++) {
      this._perViewChange(insertTuples[i].view, insertTuples[i].record);
    }

    let j: number = 0;
    const viewLength: number = this._viewContainer.length;
    for (; j < viewLength; j++) {
      const viewRef: EmbeddedViewRef<VirtForOfContext<T>> = this._viewContainer.get(j) as EmbeddedViewRef<VirtForOfContext<T>>;
      viewRef.context.index = j;
      viewRef.context.count = viewLength;
    }

    changes.forEachIdentityChange((record: any) => {
      const viewRef: EmbeddedViewRef<VirtForOfContext<T>> = this._viewContainer.get(record.currentIndex) as EmbeddedViewRef<VirtForOfContext<T>>;
      viewRef.context.$implicit = record.item;
    });
  }

  private onScroll(firstIndex: number): void {
    const nbOfViews: number = this._viewContainer.length;
    let view: number = 0;
    for (let index in this.virtForOf) {
      if (!this.virtForOf.hasOwnProperty(index)) {continue;}
      if (parseInt(index) < firstIndex) { continue; }
      const viewRef: EmbeddedViewRef<VirtForOfContext<T>> = this._viewContainer.get(view) as EmbeddedViewRef<VirtForOfContext<T>>;
      viewRef.context.$implicit = this.virtForOf[index];
      view++;
      if (view >= nbOfViews) {
        break;
      }
    }
  }

  private _perViewChange(view: EmbeddedViewRef<VirtForOfContext<T>>, record: IterableChangeRecord<any>): void {
    view.context.$implicit = record.item;
  }
}
