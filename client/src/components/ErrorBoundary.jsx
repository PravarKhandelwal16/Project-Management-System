import { Component } from 'react';
export default class ErrorBoundary extends Component{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(this.state.failed)return <main className="planning-state" style={{maxWidth:600,margin:'10vh auto'}} role="alert"><h1>We couldn't open this page</h1><p>Reload to try again. If the problem continues, contact your workspace administrator.</p><button className="management-button" onClick={()=>window.location.reload()}>Reload page</button></main>;
    return this.props.children;
  }
}
