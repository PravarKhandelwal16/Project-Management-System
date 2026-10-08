import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ConfirmationContext } from '../context/ConfirmationContext';

function ConfirmationDialog({request,onAnswer}) {
  const dialog = useRef(null), cancel = useRef(null);
  const titleId = useId(), descriptionId = useId();
  useLayoutEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    cancel.current.focus();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event=>{event.preventDefault();onAnswer(false);}}>
    <div className={'confirmation-icon '+(!request.danger?'neutral':'')}><AlertTriangle size={24}/></div>
    <button type="button" className="confirmation-close" aria-label="Cancel action" onClick={()=>onAnswer(false)}><X size={18}/></button>
    <h2 id={titleId}>{request.title}</h2>
    <p id={descriptionId}>{request.description}</p>
    <div className="confirmation-actions">
      <button ref={cancel} type="button" className="management-button secondary" onClick={()=>onAnswer(false)}>Cancel</button>
      <button type="button" className={'management-button '+(request.danger?'confirmation-destructive':'')} onClick={()=>onAnswer(true)}>{request.confirmLabel}</button>
    </div>
  </dialog>;
}

export default function ConfirmationProvider({children}) {
  const [request,setRequest] = useState(null);
  const resolve = useRef(null);
  const confirm = useCallback(options => {
    // Ignore duplicate clicks while the current confirmation is open.
    if (resolve.current) return Promise.resolve(false);
    return new Promise(answer => {
      resolve.current = answer;
      setRequest({title:'Confirm action',confirmLabel:'Confirm',danger:true,...options});
    });
  }, []);
  const answer = useCallback(accepted => {
    const complete = resolve.current;
    resolve.current = null;
    setRequest(null);
    complete?.(accepted);
  }, []);
  useEffect(()=>()=>{resolve.current?.(false);resolve.current=null;},[]);
  return <ConfirmationContext.Provider value={confirm}>{children}{request&&<ConfirmationDialog request={request} onAnswer={answer}/>}</ConfirmationContext.Provider>;
}
