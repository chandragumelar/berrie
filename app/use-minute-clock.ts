'use client';
import {useState,useEffect} from 'react';
export function useMinuteClock(){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const tick=()=>{setNow(Date.now());timer=setTimeout(tick,60000-Date.now()%60000);};
  timer=setTimeout(tick,60000-Date.now()%60000);
  const focus=()=>setNow(Date.now());
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{clearTimeout(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[]);
 return now;
}
