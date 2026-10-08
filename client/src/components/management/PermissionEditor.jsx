import catalog from '@shared/access.json';
const groups = [...new Set(catalog.permissions.map(item => item.group))];
export default function PermissionEditor({ values, onChange, overrides = false, disabled = false, role, grantable, defaultPermissions = [] }) {
  return <div className="permission-groups">{groups.map(group => <fieldset key={group} className="permission-group">
    <legend>{group}</legend>
    {catalog.permissions.filter(item => item.group === group).map(item => {
      const reserved = item.administrative && !['admin', 'super_admin'].includes(role);
      const cannotGrant = grantable && !grantable.includes(item.key);
      return <label key={item.key} className="permission-option">
        {overrides ? <select aria-label={item.label} disabled={disabled || reserved} value={values[item.key] === true ? 'allow' : values[item.key] === false ? 'deny' : 'inherit'} onChange={event => {
          const next = { ...values }; if (event.target.value === 'inherit') delete next[item.key]; else next[item.key] = event.target.value === 'allow'; onChange(next);
        }}><option value="inherit">Role: {defaultPermissions.includes(item.key) ? 'allowed' : 'denied'}</option><option value="allow" disabled={cannotGrant}>Allow</option><option value="deny">Deny</option></select> :
          <input type="checkbox" disabled={disabled || reserved || (cannotGrant && !values.includes(item.key))} checked={values.includes(item.key)} onChange={event => onChange(event.target.checked ? [...values, item.key] : values.filter(key => key !== item.key))} />}
        <span>{item.label}{reserved && <small>Administrator only</small>}</span>
      </label>;
    })}
  </fieldset>)}</div>;
}
