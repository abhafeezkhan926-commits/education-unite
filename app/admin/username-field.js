import { isGeneratedUsername, makeAdminUsernameTicket, readAdminUsernameTicket, usernameOptions } from '../student-security';

export default function GeneratedUsernameField({ scope, currentUsername }) {
  const ticket = makeAdminUsernameTicket(scope);
  const { nonce } = readAdminUsernameTicket(ticket, scope);
  const options = usernameOptions(nonce);
  const keepCurrent = isGeneratedUsername(currentUsername);
  if (keepCurrent && !options.includes(currentUsername)) options.unshift(currentUsername);
  return <>
    <input type="hidden" name="usernameTicket" value={ticket} />
    <label>Choose a generated username
      <select name="username" required defaultValue={keepCurrent ? currentUsername : ''}>
        <option value="" disabled>Select a username</option>
        {options.map((name) => <option key={name}>{name}</option>)}
      </select>
    </label>
    <small>Choose a suggested username instead of a real name. Suggestions expire after 10 minutes; refresh for a new list.</small>
  </>;
}
