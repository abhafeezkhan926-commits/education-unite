import AdminNav from '../admin-nav';
import './panel.css';

export default function AdminPanelLayout({ children }) {
  return <AdminNav>{children}</AdminNav>;
}
