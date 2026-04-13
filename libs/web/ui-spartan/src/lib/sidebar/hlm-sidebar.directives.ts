import { Directive, Input, HostBinding } from '@angular/core';
import { hlm } from '../hlm-utils';

@Directive({
  selector: '[hlmSidebar]',
  standalone: true,
})
export class HlmSidebarDirective {
  @Input() class = '';
  @HostBinding('class')
  get computedClass() {
    return hlm('flex h-full w-[280px] flex-col border-r bg-card text-card-foreground', this.class);
  }
}

@Directive({
  selector: '[hlmSidebarHeader]',
  standalone: true,
})
export class HlmSidebarHeaderDirective {
  @Input() class = '';
  @HostBinding('class')
  get computedClass() {
    return hlm('flex h-14 items-center border-b px-4', this.class);
  }
}

@Directive({
  selector: '[hlmSidebarContent]',
  standalone: true,
})
export class HlmSidebarContentDirective {
  @Input() class = '';
  @HostBinding('class')
  get computedClass() {
    return hlm('flex-1 overflow-auto p-2', this.class);
  }
}

@Directive({
  selector: '[hlmSidebarFooter]',
  standalone: true,
})
export class HlmSidebarFooterDirective {
  @Input() class = '';
  @HostBinding('class')
  get computedClass() {
    return hlm('flex h-14 items-center border-t px-4', this.class);
  }
}

@Directive({
  selector: '[hlmSidebarNavItem]',
  standalone: true,
})
export class HlmSidebarNavItemDirective {
  @Input() class = '';
  @HostBinding('class')
  get computedClass() {
    return hlm(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer decoration-none text-inherit',
      this.class,
    );
  }
}
