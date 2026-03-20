import type { Thought } from '../dashboard/types'

type ThoughtStreamPanelProps = { thoughts: Thought[] }

export function ThoughtStreamPanel({ thoughts }: ThoughtStreamPanelProps) {
  return (
    <article className="panel panel-thoughts">
      <div className="card-head">
        <h2>Thought Stream</h2>
      </div>
      <ul>
        {thoughts.map((thought) => (
          <li key={thought.id}>
            <span className="thought-time">{thought.at}</span>
            <p>{thought.text}</p>
          </li>
        ))}
      </ul>
    </article>
  )
}
