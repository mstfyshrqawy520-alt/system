import{a}from"./index-BQ-yPuS_.js";const t="/accounting/purchase-orders",e=async()=>(await a.get(t)).data.data,n=async c=>(await a.get(`${t}/${c}`)).data.data;export{n as a,e as g};
