import {mountFixedHeader} from './fixed-header.mjs';

const header=document.querySelector('.head');

if(header){
  mountFixedHeader({
    header,
    reserveSpace:false,
    safeAreaIncluded:true,
    background:'var(--ocean)',
  });
}
