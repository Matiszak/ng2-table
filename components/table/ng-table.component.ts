import {ApplicationRef, Component, ComponentResolver, ElementRef, EventEmitter, Input, Injector, OnInit, Output} from '@angular/core';
import {CORE_DIRECTIVES, NgClass} from '@angular/common';
import {NgTableSortingDirective} from './ng-table-sorting.directive';

function compileToComponent(template:any, directives:Array<any>, row:any, column:any, rowIndex:number, columnIndex:number) {
    @Component({
        selector: 'fake',
        template, directives
    })
    class FakeComponent {
      get row() {
          return row;
      }
      get column() {
          return column;
      }
      get rowIndex() {
          return rowIndex;
      }
      get columnIndex() {
          return columnIndex;
      }
    };
    return FakeComponent;
}

@Component({
  selector: 'ng-table',
  template: `
    <table [ngClass]="classMap"
           role="grid" style="width: 100%;">
      <thead>
      <tr role="row">
        <th *ngFor="let column of columns" [ngTableSorting]="config" [column]="column" (sortChanged)="onChangeTable($event)">
          {{column.title}}
          <i *ngIf="config && column.sort" class="pull-right fa"
            [ngClass]="{'fa-chevron-down': column.sort === 'desc', 'fa-chevron-up': column.sort === 'asc'}"></i>
        </th>
      </tr>
      </thead>
      <tbody>
      <tr *ngFor="let row of rows; let i = index">
        <td *ngFor="let column of columns; let j = index">
          <span *ngIf="column.template==null">
            {{getData(row, column.name)}}
          </span>
          <span *ngIf="column.template" class="row-{{i}}-col-{{j}}"></span>
        </td>
      </tr>
      </tbody>
    </table>
`,
  directives: [NgTableSortingDirective, NgClass, CORE_DIRECTIVES]
})
export class NgTableComponent implements OnInit {
  // Table values
  @Input() public rows:Array<any> = [];
  @Input() public config:any = {};

  // Outputs (Events)
  @Output() public tableChanged:EventEmitter<any> = new EventEmitter();

  @Input()
  public set columns(values:Array<any>) {
    values.forEach((value:any) => {
      let column = this._columns.find((col:any) => col.name === value.name);
      if (column) {
        Object.assign(column, value);
      }
      if (!column) {
        this._columns.push(value);
      }
    });
  }

  public get columns():Array<any> {
    return this._columns;
  }

  private appRef: ApplicationRef;
  private compiler: ComponentResolver;
  private elementRef: ElementRef;
  private injector: Injector;

  private classMap:string;

  public constructor(appRef: ApplicationRef, compiler: ComponentResolver, elementRef: ElementRef, injector: Injector) {
    this.appRef = appRef;
    this.compiler = compiler;
    this.elementRef = elementRef;
    this.injector = injector;
  }

  public ngOnInit():void {
    this.classMap = this.elementRef.nativeElement.getAttribute('class') || { 'table': true, 'table-striped': true, 'table-bordered': true, 'dataTable': true};

    for (let i = 0; i < this.rows.length; i++) {
        for (let j = 0; j < this.columns.length; j++) {
        if (this.columns[j].template) {
            this.compiler.resolveComponent(
                compileToComponent(this.columns[j].template, this.columns[j].directives || [], this.rows[i], this.columns[j], i, j)
            ).then((factory) => {
                let rowIndex = factory.componentType.prototype.rowIndex;
                let columnIndex = factory.componentType.prototype.columnIndex;

                let cmpRef = factory.create(this.injector, null, ".row-" + rowIndex + "-col-" + columnIndex);
                (<any>this.appRef)._loadComponent(cmpRef);
            });
        }
      }
    }
  }

  public get configColumns():any {
    let sortColumns:Array<any> = [];

    this.columns.forEach((column:any) => {
      if (column.sort) {
        sortColumns.push(column);
      }
    });

    return {columns: sortColumns};
  }

  private _columns:Array<any> = [];

  public onChangeTable(column:any):void {
    this._columns.forEach((col:any) => {
      if (col.name !== column.name) {
        col.sort = '';
      }
    });
    this.tableChanged.emit({sorting: this.configColumns});
  }

  public getData(row:any, propertyName:string):string {
    return propertyName.split('.').reduce((prev:any, curr:string) => prev[curr], row);
  }
}
