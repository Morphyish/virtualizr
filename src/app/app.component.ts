import {Component, ElementRef, ViewChild} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  @ViewChild('progress') public progress: ElementRef;

  public showTable: boolean = false;
  public loading: boolean = false;

  public data: string[][] = [];

  public nbOfLines: number = 100;
  public nbOfColumns: number = 20;
  public scrollPosition: number = 5;

  private dataGenerator: Worker;
  private nextFrame: number;

  public generateData(): void {
    if (!this.loading) {
      this.showTable = false;
      this.loading = true;
      this.dataGenerator = new Worker('assets/worker/data-generator.js');
      this.dataGenerator.onmessage = (message: MessageEvent): void => {
        switch (message.data.context) {
          case 'update':
            this.updateProgress(message.data.progress);
            break;
          case 'done':
            this.closeGenerator(message.data.result);
            break;
          case 'error':
            this.closeGenerator();
            break;
          default:
            this.closeGenerator();
            break;
        }
      };
      this.dataGenerator.postMessage({'nbOfLines': this.nbOfLines, 'nbOfColumns': this.nbOfColumns});
    }
  }

  public invertData(): void {
    this.data = this.data.reverse();
  }

  public randomizePosition(): void {
    this.scrollPosition = Math.floor(Math.random() * this.data.length);
  }

  private closeGenerator(data?: string[][]): void {
    this.dataGenerator.terminate();
    if (data) {
      this.loading = false;
      this.showTable = true;
      this.data = data;
    }
  }

  private updateProgress(progress: number): void {
    if (this.nextFrame) {
      cancelAnimationFrame(this.nextFrame);
    }
    this.nextFrame = requestAnimationFrame(() => {
      delete this.nextFrame;
      if (this.loading) {
        this.progress.nativeElement.style.width = progress + '%';
      }
    });
  }
}
