import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  success(message: string, action = 'Dismiss'): void {
    this.snackBar.open(message, action, {
      duration: 3500,
      panelClass: ['snack-success'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  error(message: string, action = 'Dismiss'): void {
    this.snackBar.open(message, action, {
      duration: 6000,
      panelClass: ['snack-error'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  info(message: string, action = 'OK'): void {
    this.snackBar.open(message, action, {
      duration: 3000,
      panelClass: ['snack-info'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  undoable(message: string, duration = 5000): Promise<boolean> {
    const ref = this.snackBar.open(message, 'Undo', {
      duration,
      panelClass: ['snack-undo'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
    return new Promise(resolve => {
      ref.onAction().subscribe(() => resolve(true));
      ref.afterDismissed().subscribe(() => resolve(false));
    });
  }
}
