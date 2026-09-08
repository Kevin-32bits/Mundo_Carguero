import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Output() pageChange = new EventEmitter<number>();

  goFirst() {
    this.emit(1);
  }

  goPrev() {
    this.emit(this.currentPage - 1);
  }

  goNext() {
    this.emit(this.currentPage + 1);
  }

  goLast() {
    this.emit(this.totalPages);
  }

  private emit(page: number) {
    const safeTotal = Math.max(1, this.totalPages || 1);
    const safePage = Math.min(Math.max(1, page || 1), safeTotal);
    this.pageChange.emit(safePage);
  }
}