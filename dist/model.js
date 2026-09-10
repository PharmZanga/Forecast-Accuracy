export const MONTHS=['January','February','March','April','May','June','July','August'];
export const FIELDS=['Forecast','Consumption','Issues','Receipts','Closing Stock'];
export const HEADERS=['Commodity','Programme','Month',...FIELDS];
export const PROGRAMMES=['Family planning','Maternal health','Vaccines','Essential medicines','MedSurg','ARV','Malaria','Renal','Nutrition','Cancer'];
export const commodityKey=(name,programme)=>JSON.stringify([programme,name.toLowerCase()]);
const PROGRAMME_ALIASES={fp:'Family planning',familyplanningcommodities:'Family planning',mh:'Maternal health',maternal:'Maternal health',maternalhealthcommodities:'Maternal health',vaccine:'Vaccines',immunisation:'Vaccines',immunization:'Vaccines',epi:'Vaccines',essentialmedicine:'Essential medicines',em:'Essential medicines',medsurge:'MedSurg',medicalsurgical:'MedSurg',medicalsurgicalsupplies:'MedSurg',medicalandsurgicalsupplies:'MedSurg',medicalandsurgical:'MedSurg',arvs:'ARV',antiretroviral:'ARV',antiretrovirals:'ARV',oncology:'Cancer',unclassified:'Unclassified'};
export const normalise=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
export function classify(name,programme=''){
 const p=normalise(programme);
 if(p){const matched=PROGRAMMES.find(value=>normalise(value)===p)||PROGRAMME_ALIASES[p];if(matched)return matched;throw new Error(`Unknown programme “${programme}”. Use ${PROGRAMMES.join(', ')} or Unclassified.`);}
 if(/oxytocin|tranexamic|magnesium\s*(sulphate|sulfate)|misoprostol|carbetocin|ergometrine|methylergometrine/i.test(name))return 'Maternal health';
 if(/condom|contracept|depo.?provera|dmpa|medroxyprogesterone|sayana|jadelle|implanon|nexplanon|levonorgestrel|etonogestrel|iud|iucd|intrauterine|ethinyl\s*estradiol|ethinylestradiol|microgynon|microlut/i.test(name))return 'Family planning';
 return 'Unclassified';
}
export function parseMonth(value){
 let year=2026,month;
 if(value instanceof Date){year=value.getUTCFullYear();month=value.getUTCMonth()+1;}
 else if(typeof value==='number'){
  if(Number.isInteger(value)&&value>=1&&value<=12)month=value;
  else{const date=new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000);year=date.getUTCFullYear();month=date.getUTCMonth()+1;}
 }else{
  const text=String(value??'').trim();let match;
  if((match=text.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2})(?:T.*)?)?$/))){year=+match[1];month=+match[2];if(match[3]&&(+match[3]<1||+match[3]>new Date(Date.UTC(year,month,0)).getUTCDate()))throw new Error(`Invalid date “${text}”.`);}
  else if((match=text.match(/^(\d{1,2})[-/](\d{4})$/))){month=+match[1];year=+match[2];}
  else if((match=text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))){year=+match[3];month=+match[2];if(+match[1]>12&&+match[1]<=new Date(Date.UTC(year,month,0)).getUTCDate()){}else throw new Error('Ambiguous date. Use YYYY-MM or an Excel date cell.');}
  else if((match=text.match(/^([a-z]+)(?:[\s,/-]+(\d{4}))?$/i))){month=['january','february','march','april','may','june','july','august','september','october','november','december'].findIndex(m=>m===match[1].toLowerCase()||m.slice(0,3)===match[1].toLowerCase())+1;year=match[2]?+match[2]:2026;}
  else if(/^\d{1,2}$/.test(text))month=+text;
 }
 if(year!==2026||!Number.isInteger(month)||month<1||month>8)throw new Error(`Month “${value}” is not January–August 2026. Use YYYY-MM, a month name, or an Excel date.`);
 return month;
}
export function parseNumber(value,field){
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const text=String(value).trim();
 if(typeof value!=='number'&&!/^(?:\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(text))throw new Error(`${field} must be a non-negative number or blank.`);
 const n=Number(text.replace(/,/g,''));if(!Number.isFinite(n)||n<0)throw new Error(`${field} must be a non-negative number or blank.`);return n;
}
export function parseSheets(sheets){
 const rows=[],errors=[],warnings=[],seen=new Set(),names=new Map();let matchedSheets=0;
 for(const sheet of sheets){
  const data=sheet.data;const headerIndex=data.findIndex(row=>['commodity','month','forecast'].every(key=>row.some(v=>normalise(v)===key)));
  if(headerIndex<0){warnings.push(`${sheet.name}: skipped (Commodity, Month and Forecast headers not found).`);continue;}matchedSheets++;
  const header=data[headerIndex].map(normalise);const indexes=Object.fromEntries(HEADERS.map(h=>[h,header.indexOf(normalise(h))]));
  if(HEADERS.some(h=>header.filter(v=>v===normalise(h)).length>1)){errors.push(`${sheet.name}: duplicate column headers.`);continue;}
  const missing=FIELDS.filter(f=>indexes[f]<0);if(missing.length)warnings.push(`${sheet.name}: missing columns treated as unavailable: ${missing.join(', ')}.`);
  for(let i=headerIndex+1;i<data.length;i++){
   const raw=data[i];if(!raw.some(v=>v!==null&&v!==undefined&&String(v).trim()!==''))continue;
   try{
    const commodity=String(raw[indexes.Commodity]??'').trim().replace(/\s+/g,' ');if(!commodity)throw new Error('Commodity is required.');
    const programme=classify(commodity,raw[indexes.Programme]);const month=parseMonth(raw[indexes.Month]);const key=commodityKey(commodity,programme);
    if(seen.has(`${key}|${month}`))throw new Error(`Duplicate ${commodity} / ${MONTHS[month-1]}. Combine source records in consistent units before importing.`);
    const row={commodity:names.get(key)??commodity,programme,month};for(const field of FIELDS)row[field]=parseNumber(raw[indexes[field]],field);
    if(FIELDS.every(f=>row[f]===null))throw new Error('No quantities entered; remove unused template rows.');
    names.set(key,row.commodity);seen.add(`${key}|${month}`);rows.push(row);
   }catch(error){errors.push(`${sheet.name}, row ${i+1}: ${error.message}`);}
  }
 }
 if(!matchedSheets)errors.push('No supported data sheets found. Download the template for the required layout.');
 if(!rows.length&&!errors.length)errors.push('No data rows found. Enter quantities in the template.');
 return {rows,errors,warnings};
}
export const sum=values=>{const valid=values.filter(v=>v!==null&&v!==undefined);return valid.length?valid.reduce((s,v)=>s+v,0):null;};
export function analyseCommodity(allRows,name,start=1,end=8,low=3,high=6,programme=undefined){
 const candidates=allRows.filter(r=>r.commodity.toLowerCase()===name.toLowerCase());
 if(programme===undefined&&new Set(candidates.map(r=>r.programme)).size>1)throw new Error('Programme is required when a commodity belongs to multiple programmes.');
 const all=candidates.filter(r=>programme===undefined||r.programme===programme);const rows=all.filter(r=>r.month>=start&&r.month<=end).sort((a,b)=>a.month-b.month);
 const pairs=rows.filter(r=>r.Forecast!==null&&r.Consumption!==null);const actual=sum(pairs.map(r=>r.Consumption)),forecast=sum(pairs.map(r=>r.Forecast));
 const errors=sum(pairs.map(r=>Math.abs(r.Consumption-r.Forecast)));const variance=pairs.length?actual-forecast:null;const accuracy=actual>0?Math.max(0,1-errors/actual)*100:null;
 const final=all.find(r=>r.month===end);const windowStart=Math.max(1,end-2);const window=all.filter(r=>r.month>=windowStart&&r.month<=end&&r.Consumption!==null);const amc=window.length===end-windowStart+1?sum(window.map(r=>r.Consumption))/window.length:null;
 const stock=final?.['Closing Stock']??null;const mos=stock!==null&&amc>0?stock/amc:null;
 const complete=pairs.length===end-start+1;const needsData=!complete||mos===null||rows.some(r=>FIELDS.some(f=>r[f]===null))||all[0]?.programme==='Unclassified';
 let status='In range',tone='good';if(stock===0){status='No closing stock';tone='danger';}else if(mos!==null&&mos<low){status='Low stock';tone='danger';}else if(mos!==null&&mos>high){status='High stock';tone='warning';}else if(accuracy!==null&&accuracy<80){status='Forecast mismatch';tone='warning';}else if(needsData||accuracy===null){status='Data review';tone='neutral';}
 return {key:commodityKey(name,all[0]?.programme??programme??'Unclassified'),name,programme:all[0]?.programme??programme??'Unclassified',rows,pairs:pairs.length,expected:end-start+1,complete,needsData,totals:Object.fromEntries(FIELDS.map(f=>[f,f==='Closing Stock'?stock:sum(rows.map(r=>r[f]))])),counts:Object.fromEntries(FIELDS.map(f=>[f,rows.filter(r=>r[f]!==null).length])),variance,variancePct:forecast>0?variance/forecast*100:null,accuracy,mos,stock,amc,status,tone,end};
}
export function analyse(rows,{programme='all',start=1,end=8,low=3,high=6}={}){
 const products=new Map(rows.filter(r=>programme==='all'||r.programme===programme).map(r=>[commodityKey(r.commodity,r.programme),r]));
 return [...products.values()].map(r=>analyseCommodity(rows,r.commodity,start,end,low,high,r.programme)).sort((a,b)=>a.programme.localeCompare(b.programme)||a.name.localeCompare(b.name));
}
export function recommendations(c,low=3,high=6){
 const list=[];const add=(title,reason,action,tone='warning')=>list.push({commodity:c.name,programme:c.programme,title,reason,action,tone});
 if(c.stock===0)add('No closing stock reported',`${MONTHS[c.end-1]} closing stock is zero. This does not establish how long stock was unavailable.`, 'Confirm current availability and incoming orders; assess redistribution or expedited replenishment.','danger');
 else if(c.mos!==null&&c.mos<low)add('Replenishment review',`${c.mos.toFixed(1)} months of stock, below the ${low}-month planning threshold.`, 'Reconcile the supply pipeline and lead time; review near-term replenishment and redistribution.','danger');
 if(c.mos!==null&&c.mos>high)add('Excess-stock review',`${c.mos.toFixed(1)} months of stock, above the ${high}-month planning threshold.`, 'Check expiry dates and committed receipts; assess redistribution and delivery rescheduling.');
 if(c.accuracy!==null&&c.accuracy<80)add('Revisit the demand forecast',`${c.accuracy.toFixed(1)}% accuracy across ${c.pairs} matched months; net consumption is ${c.variance>0?'above':c.variance<0?'below':'equal to'} forecast.`, 'Review monthly errors, stockout-adjusted demand, service volumes and programme changes before revising assumptions.');
 const flow=c.rows.filter(r=>r.Issues!==null&&r.Receipts!==null);if(flow.length&&sum(flow.map(r=>r.Issues))>sum(flow.map(r=>r.Receipts)))add('Outflow exceeds inflow',`Issues exceed receipts in total across ${flow.length} matched months. Existing stock may have covered the difference.`, 'Reconcile opening and closing balances, adjustments, and scheduled deliveries before confirming a supply gap.','neutral');
 if(c.needsData||c.accuracy===null)add('Complete the evidence',`${c.pairs}/${c.expected} forecast–consumption pairs. ${c.mos===null?'Stock cover unavailable. ':''}${c.programme==='Unclassified'?'Programme classification required. ':''}${c.accuracy===null?'Accuracy unavailable.':''}`, 'Verify programme labels, missing months and measures, reporting units and closing balances before approving the quantification.','neutral');
 return list;
}
export function demoRows(){
 const products=[['DMPA-IM 150 mg / mL','Family planning',42000,.93,4.2],['Male condoms','Family planning',360000,1.09,3.6],['Combined oral contraceptive pills','Family planning',66000,.84,5.2],['Levonorgestrel implant','Family planning',17000,1.3,1.8],['Copper IUD','Family planning',11000,.95,4.4],['Oxytocin 10 IU / mL','Maternal health',58000,1.21,1.3],['Tranexamic Acid 500 mg / 5 mL','Maternal health',23000,1.06,3.5],['Magnesium Sulphate 50%','Maternal health',31000,.62,8.1],['Misoprostol 200 mcg','Maternal health',45000,1.04,4.1]];
 return products.flatMap(([commodity,programme,base,ratio,cover],index)=>MONTHS.map((_,i)=>{const forecast=Math.round(base*(1+i*.018));const consumption=Math.round(forecast*ratio*[.88,.94,1.03,.98,1.08,1.04,1.13,1.09][i]);return {commodity,programme,month:i+1,Forecast:forecast,Consumption:consumption,Issues:Math.round(consumption*(1.03+(index%3)*.01)),Receipts:i%3===index%3?Math.round(base*2.2):Math.round(base*.35), 'Closing Stock':Math.round(consumption*(cover+(7-i)*.12))};}));
}
