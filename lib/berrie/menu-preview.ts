import {createOrder,makeUnits,unitFinal,type Channel,type State} from './domain.ts';
import {combinationKey,validateValues,type MenuVariable,type VariableValues} from './menu-variables.ts';
import type {MenuRow} from './workshop.ts';

// Preview uses the cashier's unit calculation on an isolated synthetic catalog.
export function previewMenu(state:State,rows:MenuRow[],variables:MenuVariable[],values:VariableValues,channel:Channel):number {
 const choices=validateValues(variables,values);
 const row=rows.find(r=>!r.archived&&combinationKey(variables,r.variableValues??{})===combinationKey(variables,choices));
 if(!row)throw Error('Pilihan belum lengkap.');
 const template=state.catalog[0];if(!template)throw Error('Menu contoh belum tersedia.');
 const price=Number(row.price);
 const sku={...structuredClone(template),id:'preview',stockGroup:'preview',name:row.name,stock:1,available:true,archived:false,variables,variableValues:row.variableValues??{},toppings:[],recipes:[],promos:{},channelPrices:{...template.channelPrices,...row.channelPrices,Toko:price}};
 const isolated={...state,catalog:[sku]};
 const order=createOrder(isolated);order.channel=channel;
 return unitFinal(makeUnits(isolated,order,sku,1,[],'Bungkus','',undefined,{},choices)[0]);
}
