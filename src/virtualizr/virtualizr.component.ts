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
    if (this._topIndex !== value) {
      this._topIndex = value;
      this.scrollTo();
    }
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
    return this.nbOfVisibleElements; // + (this.buffer * 2);
  }

  public get nbOfVisibleElements(): number {
    return Math.ceil(this.containerSize / this.elementSize);
  }

  public onScroll: Observable<{firstIndex: number, lastIndex: number}>;
  private _onScroll: Subject<{firstIndex: number, lastIndex: number}> = new Subject<{firstIndex: number, lastIndex: number}>();

  private buffer: number = 2;
  private wrapperPosition: number = 0;

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
        this.scrollTo();
      });

      this.renderer.listen(this.elm.nativeElement, 'scroll', ($event: Event) => {
        const scrollTop: number = ($event.target as HTMLElement).scrollTop;
        const topIndex: number = Math.ceil(scrollTop / this.elementSize); // setting to the private variable so we don't trigger another scroll event
        const lastIndex: number = Math.min(topIndex + (this.nbOfVisibleElements - 1), this.nbOfElements - 1);
        const firstIndex: number = Math.min(Math.max(topIndex, 0), lastIndex - (this.nbOfVisibleElements - 1));

        this._topIndex = topIndex;
        this.firstIndex = firstIndex > this.buffer ? firstIndex - this.buffer : firstIndex;
        this.lastIndex = lastIndex < (this.nbOfElements - 1) - this.buffer ? lastIndex + this.buffer : lastIndex;

        this._onScroll.next({
          firstIndex: this.firstIndex,
          lastIndex: this.lastIndex,
        });
        this.updateWrapperPosition();

        if (this.topIndexChange.observers.length > 0) {
          this.ngZone.run(() => {
            this.topIndexChange.emit(this._topIndex);
          });
        }
      });
    });
  }

  public setElementSize(value: number): void {
    this.elementSize = value;
  }

  public updateIndexes(): [number, number] {
    this.firstIndex = Math.max(this._topIndex, 0);
    this.lastIndex = Math.min(this._topIndex + (this.nbOfVisibleElements - 1), this.nbOfElements - 1);

    return [this.firstIndex, this.lastIndex];
  }

  private scrollTo(): void {
    this.elm.nativeElement.scrollTop = this.topIndex * this.elementSize;
  }

  private updateWrapperPosition(): void {
    this.wrapperPosition = this.firstIndex * this.elementSize;
    // this.wrapperPosition = Math.min(this.wrapperPosition, this.totalSize - ((this.lastIndex - this.firstIndex) * this.elementSize));
    this.wrapper.nativeElement.style.transform = 'translateY(' + this.wrapperPosition + 'px)';
  }
}
