import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import * as socialApi from '../api/social.js';
import Avatar from '../components/Avatar.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/Feedback.jsx';

// Mirrors BADGE_RULES in server/utils/points.js.
const BADGE_LEGEND = [
  ['First Bite', 'Posted your first review'],
  ['Regular', '10 reviews posted'],
  ['Critic', '50 reviews posted'],
  ['Verified Explorer', '5 GPS-verified reviews'],
  ['Ground Truth', '25 GPS-verified reviews'],
  ['Curator', 'Created 3 lists'],
  ['Trailblazer', 'Planned 3 food crawls'],
  ['Local Legend', 'Earned 100 points'],
];

const POINTS_LEGEND = [
  ['Review submitted', '+1'],
  ['Verified review', '+2'],
  ['Helpful vote received', '+1'],
  ['List created', '+5'],
  ['Crawl created', '+3'],
];

const RANK_STYLE = ['text-accent', 'text-muted', 'text-muted'];

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });

  useEffect(() => {
    socialApi
      .getLeaderboard()
      .then((r) => {
        setRows(r);
        setState({ loading: false, error: null });
      })
      .catch((err) => setState({ loading: false, error: err }));
  }, []);

  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState error={state.error} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
      <p className="text-sm text-muted">Ranked by points earned across reviews, lists, and crawls.</p>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No one on the board yet" hint="Points appear once people start reviewing." />
        </div>
      ) : (
        <div className="card mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="px-4 py-3 font-medium">Rank</th>
                <th scope="col" className="px-4 py-3 font-medium">User</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Points</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Reviews</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Verified</th>
                <th scope="col" className="px-4 py-3 font-medium">Badges</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className={`px-4 py-3 font-semibold ${RANK_STYLE[row.rank - 1] ?? ''}`}>
                    {row.rank}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/profile/${row.id}`} className="flex items-center gap-2 hover:text-accent">
                      <Avatar user={row} size={28} />
                      <span className="font-medium">{row.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{row.points}</td>
                  <td className="px-4 py-3 text-right text-muted">{row.reviewCount}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-success">
                      {row.verifiedCount > 0 && <BadgeCheck size={13} />}
                      {row.verifiedCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.badges.length === 0 ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        row.badges.map((b) => (
                          <span
                            key={b}
                            className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent"
                          >
                            {b}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Badges</h2>
          <dl className="mt-3 space-y-2">
            {BADGE_LEGEND.map(([badge, how]) => (
              <div key={badge} className="flex items-start gap-2">
                <dt className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                  {badge}
                </dt>
                <dd className="text-xs text-muted">{how}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold">How points work</h2>
          <dl className="mt-3 space-y-1.5">
            {POINTS_LEGEND.map(([action, value]) => (
              <div key={action} className="flex justify-between text-xs">
                <dt className="text-muted">{action}</dt>
                <dd className="font-medium text-accent">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
