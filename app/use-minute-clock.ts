'use client';
import {useState,useEffect} from 'react';
export function useMinuteClock(resolution=60000){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const tick=()=>{setNow(Date.now());timer=setTimeout(tick,resolution-Date.now()%resolution);};
  timer=setTimeout(tick,resolution-Date.now()%resolution);
  const focus=()=>setNow(Date.now());
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{clearTimeout(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[resolution]);
 return now;
}
