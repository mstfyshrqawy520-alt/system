import apiClient from './client';import{PurchaseOrder}from'../types/purchaseOrder';const b='/accounting/purchase-orders';
export const getAccountingPurchaseOrdersApi=async()=> (await apiClient.get<{data:PurchaseOrder[]}>(b)).data.data;
export const getAccountingPurchaseOrderApi=async(id:number)=> (await apiClient.get<{data:PurchaseOrder}>(`${b}/${id}`)).data.data;
export const approveAccountingPurchaseOrderApi=async(id:number,p:{comment?:string;financial_notes?:string}={})=>(await apiClient.post<{data:PurchaseOrder}>(`${b}/${id}/approve`,p)).data.data;
export const returnAccountingPurchaseOrderApi=async(id:number,comment:string)=>(await apiClient.post<{data:PurchaseOrder}>(`${b}/${id}/return`,{comment})).data.data;
