export function createIdleSession({onExpire,isExempt=()=>false,now=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout,timeout=15*60*1000}){
 let active=false,last=0,timer=null;
 const stop=()=>{active=false;cancel(timer);timer=null};
 const check=()=>{if(!active)return;if(isExempt()){stop();return}const remaining=timeout-(now()-last);if(remaining<=0){stop();onExpire();return}cancel(timer);timer=schedule(check,remaining)};
 return {start(){stop();if(isExempt())return;active=true;last=now();check()},stop,check,activity(){if(!active)return;if(isExempt()){stop();return}if(now()-last>=timeout){check();return}last=now()}};
}
