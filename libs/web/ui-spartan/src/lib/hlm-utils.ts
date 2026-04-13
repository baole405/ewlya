import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function hlm(input: string, ...inputs: ClassValue[]) {
  return twMerge(clsx(input, ...inputs));
}
