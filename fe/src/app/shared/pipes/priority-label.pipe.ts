import { Pipe, PipeTransform } from '@angular/core';

const LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'High',
  3: 'Medium',
  4: 'Low',
  5: 'Minimal',
};

@Pipe({ name: 'priorityLabel', standalone: true })
export class PriorityLabelPipe implements PipeTransform {
  transform(value: number): string {
    return LABELS[value] ?? `P${value}`;
  }
}
