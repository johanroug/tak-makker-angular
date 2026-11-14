import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { of } from 'rxjs';
import { OfferPreview } from './offer-preview.component';
import { ProjectCustomer } from '../customer-picker/project-customer.component';
import { CustomerService,CustomerSummary } from '../../../core/customers/customer.service';
import { ProjectService } from '../../../core/projects/project.service';
import { OfferService } from '../../../core/offers/offer.service';
import { OfferPdfService } from '../../../core/offers/offer-pdf.service';

const customer:CustomerSummary={postal_code:"",city:"",id:'customer-b',company_id:'company',name:'Ny valgt kunde',address:'Kontaktvej',email:'',phone:'',created_at:'',updated_at:'',project_count:1,last_activity:'',possible_duplicate:false};
const data={project:{id:'project-a',customer_id:'customer-a',customer_name:'Otto',customer_address:'Otto vej 1',title:'Projekt',hourly_rate:450,work_address:'Arbejdsvej',description:'Beskrivelse',offer_description:'Tilbud',validity_days:14,payment_terms:'',reservations:''},customer:{...customer,id:'customer-a',name:'Otto',address:'Otto vej 1'},company:{name:'Firma',cvr:'12345678',address:'Firmaadresse',phone:'12345678',email:'firma@example.test'},workItems:[],materials:[],messages:[]} as unknown as Awaited<ReturnType<ProjectService['getProject']>>;

const dialogShow=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal');
const dialogClose=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'close');
describe('Project details save and cancellation',()=>{
  const update=vi.fn();const customers={search:vi.fn(),save:vi.fn(),link:vi.fn()};
  beforeEach(async()=>{
    update.mockReset().mockResolvedValue(undefined);
    customers.search.mockReset().mockReturnValue(of([customer]));customers.save.mockReset();customers.link.mockReset();
    vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
    Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','');}});
    Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute('open');}});
    await TestBed.configureTestingModule({imports:[OfferPreview],providers:[provideRouter([]),{provide:ProjectService,useValue:{updateProjectDetails:update}},{provide:CustomerService,useValue:customers},{provide:OfferService,useValue:{}},{provide:OfferPdfService,useValue:{}}]}).compileComponents();
  });
  afterEach(()=>{TestBed.resetTestingModule();vi.restoreAllMocks();vi.unstubAllGlobals();
    if(dialogShow)Object.defineProperty(HTMLDialogElement.prototype,'showModal',dialogShow);else Reflect.deleteProperty(HTMLDialogElement.prototype,'showModal');
    if(dialogClose)Object.defineProperty(HTMLDialogElement.prototype,'close',dialogClose);else Reflect.deleteProperty(HTMLDialogElement.prototype,'close');
  });
  function open(){const fixture=TestBed.createComponent(OfferPreview);fixture.componentRef.setInput('data',data);fixture.detectChanges();fixture.componentInstance.startEditing();fixture.detectChanges();const editor=fixture.debugElement.query(By.directive(ProjectCustomer)).componentInstance as ProjectCustomer;return{fixture,component:fixture.componentInstance,editor};}
  it('cancels a chosen customer without saving or changing the original customer',()=>{
    const {fixture,component,editor}=open();editor.start('existing');editor.select({id:customer.id,customer});fixture.detectChanges();
    expect(update).not.toHaveBeenCalled();expect(customers.link).not.toHaveBeenCalled();
    component.cancelEditing();fixture.detectChanges();component.startEditing();fixture.detectChanges();
    const reopened=fixture.debugElement.query(By.directive(ProjectCustomer)).componentInstance as ProjectCustomer;
    expect(reopened.selection().choice).toBeNull();expect(data.project.customer_id).toBe('customer-a');expect(update).not.toHaveBeenCalled();
  });
  it('sends the chosen customer only when Gem ændringer is pressed',async()=>{
    const {fixture,component,editor}=open();editor.start('existing');editor.select({id:customer.id,customer});fixture.detectChanges();
    expect(update).not.toHaveBeenCalled();await component.saveDetails();
    expect(update).toHaveBeenCalledWith('project-a',{}, {id:customer.id,customer},'customer-a');
    expect(component.isEditing()).toBe(false);expect(customers.save).not.toHaveBeenCalled();expect(customers.link).not.toHaveBeenCalled();
  });
  it('retains a draft if the atomic save fails',async()=>{
    update.mockRejectedValue(new Error('Save failed'));
    const {fixture,component,editor}=open();editor.start('existing');editor.select({id:customer.id,customer});fixture.detectChanges();
    await component.saveDetails();expect(component.isEditing()).toBe(true);expect(editor.selection().choice?.id).toBe(customer.id);expect(component.saveError()).not.toBe('');
  });
  it('does not create a new customer until the project is saved',async()=>{
    const {fixture,component,editor}=open();editor.start('new');fixture.detectChanges();
    const input=fixture.nativeElement.querySelector('app-project-customer [formControlName="name"]');input.value='Ny kunde';input.dispatchEvent(new Event('input'));fixture.detectChanges();
    expect(customers.save).not.toHaveBeenCalled();expect(update).not.toHaveBeenCalled();
    await component.saveDetails();expect(update).toHaveBeenCalledWith('project-a',{},expect.objectContaining({values:expect.objectContaining({name:'Ny kunde'})}),'customer-a');
  });
});
