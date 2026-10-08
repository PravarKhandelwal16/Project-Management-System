import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
export default function useRemote(endpoint) {
  const [state,setState]=useState({data:null,loading:true,error:''});
  const [version,setVersion]=useState(0);
  const reload=useCallback(()=>setVersion(value=>value+1),[]);
  useEffect(()=>{
    let active=true;
    Promise.resolve().then(async()=>{
      if (!active) return;
      setState(previous=>({...previous,loading:true,error:''}));
      if(!endpoint) {setState({data:null,loading:false,error:''});return;}
      try { const response=await apiRequest(endpoint); if(active) setState({data:response.data,loading:false,error:''}); }
      catch(error) {if(active) setState({data:null,loading:false,error:error.message});}
    });
    return()=>{active=false;};
  },[endpoint,version]);
  return {...state,reload};
}
