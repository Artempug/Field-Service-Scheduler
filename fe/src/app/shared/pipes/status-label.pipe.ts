import { Pipe, PipeTransform } from '@angular/core';
import { RequestStatus } from '../../core/models';

const LABELS: Record<RequestStatus, string> = {
  new: 'New',
  scheduled: 'Scheduled',
  en_route: 'En Route',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(value: RequestStatus | string): string {
    return LABELS[value as RequestStatus] ?? value;
  }
}
