import {NgModule} from '@angular/core';
import {VirtualizrComponent} from './virtualizr.component';
import {VirtualizrDirective} from './virtualizr.directive';

@NgModule({
  declarations: [
    VirtualizrComponent,
    VirtualizrDirective,
  ],
  exports: [
    VirtualizrComponent,
    VirtualizrDirective,
  ],
  imports: [],
})
export class VirtualizrModule {
}
