import {Component, ElementRef, EventEmitter, Input, NgZone, OnInit, Output, Renderer2, ViewChild} from '@angular/core';
import {Observable, Subject} from 'rxjs/index';

export abstract class VirtualizrWrapper {
  public nbOfElements: number;
  public nbOfElementsDisplayed: number;

  public onScroll: Observable<{firstIndex: number, lastIndex: number}>;

  public setElementSize: (value: number) => void;
  public updateIndexes: () => [number, number];
}

@Component({
  providers: [{provide: VirtualizrWrapper, useExisting: VirtualizrComponent}],
  selector: '[virtualizr]',
  styleUrls: ['./virtualizr.component.scss'],
  templateUrl: 'virtualizr.component.html',
})
export class VirtualizrComponent implements OnInit {
  @Input()
  public get topIndex(): number {
    return this._topIndex;
  }
  public set topIndex(value: number) {
    this._topIndex = value;
    this.scrollTo();
  }

  @Input() public autoShrink: boolean = false;
  @Input() public minAutoShrink: number = 0;

  @Output() public topIndexChange: EventEmitter<number> = new EventEmitter<number>();

  @ViewChild('mock') public mock: ElementRef;
  @ViewChild('wrapper') public wrapper: ElementRef;

  public elementSize: number = 0;
  public nbOfElements: number = 0;

  public containerSize: number = 0;

  public get totalSize(): number {
    return this.elementSize * this.nbOfElements;
  }

  public get nbOfElementsDisplayed(): number {
    return this.nbOfVisibleElements + (this.buffer * 2);
  }

  public get nbOfVisibleElements(): number {
    return Math.ceil(this.containerSize / this.elementSize);
  }

  public onScroll: Observable<{firstIndex: number, lastIndex: number}>;
  private _onScroll: Subject<{firstIndex: number, lastIndex: number}> = new Subject<{firstIndex: number, lastIndex: number}>();

  private buffer: number = 2;
  private wrapperPosition: number = 0;
  private wrapperSize: number = 0;

  private noDisplay: boolean = false;

  private _topIndex: number = 0;
  private firstIndex: number = 0; // include buffer
  private lastIndex: number = 0; // include buffer

  public constructor(private elm: ElementRef,
                     private ngZone: NgZone,
                     private renderer: Renderer2,) {
    this.onScroll = this._onScroll.asObservable();
  }

  public ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.containerSize = this.elm.nativeElement.clientHeight;
      requestAnimationFrame(() => {
        if (this.elm.nativeElement.style.display === '') {
          this.noDisplay = true;
          this.elm.nativeElement.style.display = 'block';
        }
        this.updateWrapperSize();
        this.scrollTo();
      });

      this.renderer.listen(this.elm.nativeElement, 'scroll', ($event: Event) => {
        const scrollTop: number = ($event.target as HTMLElement).scrollTop;
        this.updateWrapperPosition(scrollTop);
        this._topIndex = Math.max(Math.ceil(scrollTop / this.elementSize) - 2, 0); // do not remove, prevent event loop (see topIndex setter condition)
        const firstIndex: number = Math.max(this.topIndex - this.buffer, 0);
        const lastIndex: number = Math.min(this.topIndex + this.nbOfVisibleElements + this.buffer, this.nbOfElements);
        if (this.firstIndex !== firstIndex || this.lastIndex !== lastIndex) {
          this._onScroll.next({firstIndex, lastIndex});
          this.firstIndex = firstIndex;
          this.lastIndex = lastIndex;

          if (this.topIndexChange.observers.length > 0) {
            this.ngZone.run(() => {
              this.topIndexChange.emit(this._topIndex);
            });
          }
        }
      });
    });
  }

  public setElementSize(value: number): void {
    this.ngZone.runOutsideAngular(() => {
      this.elementSize = value;
      requestAnimationFrame(() => {
        this.updateWrapperSize();
      });
    });
  }

  public updateIndexes(): [number, number] {
    this.firstIndex = Math.max(this.topIndex - this.buffer, 0);
    this.lastIndex = Math.min(this.topIndex + this.nbOfVisibleElements + this.buffer, this.nbOfElements);

    return [this.firstIndex, this.lastIndex];
  }

  private scrollTo(): void {
    this.elm.nativeElement.scrollTop = (this.topIndex + this.buffer) * this.elementSize;
  }

  private updateWrapperPosition(top: number): void {
    const itemoffset: number = Math.floor(top / this.elementSize) - this.buffer;
    this.wrapperPosition = Math.max(itemoffset, 0) * this.elementSize;
    this.wrapperPosition = Math.min(this.wrapperPosition, this.totalSize - this.wrapperSize);
    this.wrapper.nativeElement.style.transform = 'translateY(' + this.wrapperPosition + 'px)';
  }

  private updateWrapperSize(): void {
    this.wrapperSize = (this.lastIndex - this.firstIndex) * this.elementSize;
    this.wrapper.nativeElement.style.height = this.wrapperSize + 'px';
  }
}
