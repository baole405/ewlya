import { Directive, Input, HostBinding } from '@angular/core';
import { hlm } from '../hlm-utils';

@Directive({
  selector: '[hlmTable]',
  standalone: true,
})
export class HlmTableDirective {
  @Input() class = '';
  @HostBinding('class')
  get computedClass() {
    return hlm('w-full caption-bottom text-sm', this.class);
  }
}

@Directive({
  selector: '[hlmTr]',
  standalone: true,
})
export class HlmTrDirective {
  @Input() class = '';
  @HostBinding('class')
  get computedClass() {
    return hlm(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      this.class,
    );
  }
}

@Directive({
  selector: '[hlmTh]',
  standalone: true,
})
export class HlmThDirective {
  @Input() class = '';
  @HostBinding('class')
  get computedClass() {
    return hlm(
      'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      this.class,
    );
  }
}

@Directive({
  selector: '[hlmTd]',
  standalone: true,
})
export class HlmTdDirective {
  @Input() class = '';
  @HostBinding('class')
  get computedClass() {
    return hlm('p-4 align-middle [&:has([role=checkbox])]:pr-0', this.class);
  }
}
