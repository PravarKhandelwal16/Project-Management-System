import { Mail } from 'lucide-react';
export default function EmailMember({email,name}) {
  if (!email) return null;
  const query = new URLSearchParams({view:'cm',fs:'1',to:email});
  return <a className="email-member" href={'https://mail.google.com/mail/?'+query} target="_blank" rel="noopener noreferrer" aria-label={'Email '+(name||email)+' in Gmail'} title={'Compose an email to '+email+' in Gmail'}><Mail size={14}/><span>Email</span></a>;
}
