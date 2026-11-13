import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ProjectCustomer } from './project-customer.component';
import { CustomerService, CustomerSummary } from '../../../core/customers/customer.service';
import { ProjectService } from '../../../core/projects/project.service';

type Data = Awaited<ReturnType<ProjectService['getProject']>>;
const customer:CustomerSummary={id:'customer-a',company_id:'company',name:'Otto',address:'Otto vej 1',email:'',phone:'',created_at:'',updated_at:'',project_count:1,last_activity:'',possible_duplicate:false};
const data={project:{id:'project-a',customer_id:null,customer_name:'Mette Hansen',customer_address:'Kontaktvej 2',work_address:'Arbejdsvej 8'},customer:null} as unknown as Data;

describe('Draft customer selection in project details',()=>{
  const service={search:vi.fn(),save:vi.fn(),link:vi.fn()};
  beforeEach(async()=>{
    for(const fn of Object.values(service))fn.mockReset();
    service.search.mockReturnValue(of([customer]));
    await TestBed.configureTestingModule({imports:[ProjectCustomer],providers:[provideRouter([]),{provide:CustomerService,useValue:service}]}).compileComponents();
  });
  afterEach(()=>TestBed.resetTestingModule());
  it('offers two choices for an unlinked project without loading customers',()=>{
    const fixture=TestBed.createComponent(ProjectCustomer);fixture.componentRef.setInput('data',data);fixture.detectChanges();
    const buttons=[...fixture.nativeElement.querySelectorAll('.customer-mode-actions button')].map((button:HTMLElement)=>button.textContent?.trim());
    expect(buttons).toEqual(['＋ Ny kunde','Eksisterende kunde']);expect(service.search).not.toHaveBeenCalled();
  });
  it('shows contact data as text and reveals customer choices only after Skift kunde',()=>{
    const fixture=TestBed.createComponent(ProjectCustomer);fixture.componentRef.setInput('data',{...data,project:{...data.project,customer_id:customer.id},customer});fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('input')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.customer-summary').textContent).toContain('Otto vej 1');
    expect(fixture.nativeElement.querySelector('.customer-edit-link').textContent).toContain('Rediger kundeoplysninger');
    expect(fixture.nativeElement.querySelector('.customer-mode-actions').textContent.trim()).toBe('Skift kunde');
    fixture.nativeElement.querySelector('.customer-mode-actions button').click();fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.customer-mode-actions button')).toHaveLength(2);
  });
  it('selects an existing customer as a draft without writing anything',()=>{
    const fixture=TestBed.createComponent(ProjectCustomer);fixture.componentRef.setInput('data',data);fixture.detectChanges();
    fixture.componentInstance.start('existing');fixture.detectChanges();
    fixture.componentInstance.select({id:customer.id,customer});fixture.detectChanges();
    expect(fixture.componentInstance.selection()).toEqual({valid:true,choice:{id:customer.id,customer}});
    expect(fixture.nativeElement.textContent).toContain('Kundevalget er ikke gemt endnu');
    expect(fixture.nativeElement.querySelector('.customer-mode-actions').textContent.trim()).toBe('Skift kunde');
    expect(service.save).not.toHaveBeenCalled();expect(service.link).not.toHaveBeenCalled();expect(data.project.customer_id).toBeNull();
    fixture.componentInstance.changeCustomer();expect(fixture.componentInstance.selection().choice).toBeNull();
  });
  it('validates a new customer only when the parent collects its draft',()=>{
    const fixture=TestBed.createComponent(ProjectCustomer);fixture.componentRef.setInput('data',data);fixture.detectChanges();
    fixture.componentInstance.start('new');fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formControlName="name"]').value).toBe('Mette Hansen');
    expect(fixture.nativeElement.querySelector('.customer-actions')).toBeNull();
    expect(fixture.componentInstance.selection().choice?.values?.name).toBe('Mette Hansen');
    expect(service.save).not.toHaveBeenCalled();expect(service.link).not.toHaveBeenCalled();
  });
});
