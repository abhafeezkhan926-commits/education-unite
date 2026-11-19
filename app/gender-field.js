import { genders } from './student-profile.mjs';

export default function GenderField({ value = '', filter = false }) {
  return <label>{filter ? 'Gender' : 'Gender (optional)'}
    <select name="gender" defaultValue={value ?? ''}>
      <option value="">{filter ? 'All genders' : 'Not specified'}</option>
      {filter && <option value="unspecified">Not specified</option>}
      {genders.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
  </label>;
}
