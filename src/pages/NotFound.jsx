import { Link } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo.js';

export default function NotFound() {
  useSeo('Page not found | AZ Store', 'This page wandered off.');
  return (
    <div className="empty" style={{ padding: '120px 24px' }}>
      <h3>This page wandered off.</h3>
      <p>Like a good scent trail, it faded. Let’s take you back to the collection.</p>
      <Link className="btn btn--primary" to="/">Back home</Link>
    </div>
  );
}
