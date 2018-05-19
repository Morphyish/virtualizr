import {Component, ElementRef, NgZone, ViewChild} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  @ViewChild('form') public form: ElementRef;
  @ViewChild('loading') public loading: ElementRef;
  @ViewChild('progress') public progress: ElementRef;
  @ViewChild('step') public step: ElementRef;

  public showTable: boolean = true;

  public thead: string[] = [];
  public data: string[][] = [];

  public nbOfLines: number = 1000000;
  public nbOfColumns: number = 10;

  private currentStep: string = '';
  private nbOfLinesCreated: number = 0;
  private oneThousandth: number = 0;

  private charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  public constructor(private ngZone: NgZone) {
  }

  public generateData(): void {
    this.showTable = false;
    this.ngZone.runOutsideAngular(() => {
      this.form.nativeElement.style.display = 'none';
      this.loading.nativeElement.style.display = 'flex';

      this.nbOfLinesCreated = 0;
      this.oneThousandth = this.nbOfLines / 1000;
      this.currentStep = 'Generating table headers...';
      this.updateProgress(() => {
        this.createHeaders();
      });
    });
  }

  private createHeaders(): void {
    let i: number = 0;
    for (; i < this.nbOfColumns; i++) {
      this.thead.push(this.generateRandomData());
    }

    this.currentStep = 'Filling table with randomly generated data...';
    this.updateProgress(() => {
      this.fillTab();
    });
  }

  private fillTab(): void {
    let j: number;
    for (; this.nbOfLinesCreated < this.nbOfLines; this.nbOfLinesCreated++) {
      j = 0;
      this.data.push([]);
      for (; j < this.nbOfColumns; j++) {
        this.data[this.nbOfLinesCreated].push(this.generateRandomData());
      }
      if (this.nbOfLinesCreated > 0 && (this.nbOfLinesCreated % this.oneThousandth) === 0) {
        this.updateProgress(this.fillTabCallback.bind(this));
        return;
      }
    }

    this.updateProgress(() => {
      this.form.nativeElement.style.display = 'block';
      this.loading.nativeElement.style.display = 'none';
    });
  }

  private fillTabCallback(): void {
    this.nbOfLinesCreated++;
    this.fillTab();
  }

  private updateProgress(callback?: () => void): void {
    requestAnimationFrame(() => {
      const progress: number = Math.round(this.nbOfLinesCreated / (this.nbOfLines + 1) * 100);
      this.progress.nativeElement.style.width = progress + '%';
      this.step.nativeElement.textContent = this.currentStep;

      if (callback) {
        callback();
      }
    });
  }

  private generateRandomData(): string {
    let text: string = '';
    const charsetLength: number = this.charset.length;

    let i: number = 0;
    for (; i < 10; i++) {
      text += this.charset[Math.floor(Math.random() * charsetLength)];
    }

    return text;
  }
}
