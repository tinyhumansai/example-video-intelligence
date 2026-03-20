type SurpriseMeterPanelProps = {
  surprise: number
}

export function SurpriseMeterPanel({ surprise }: SurpriseMeterPanelProps) {
  const segmentCount = 18
  const activeSegments = Math.round((surprise / 100) * segmentCount)

  return (
    <article className="panel panel-surprise">
      <div className="card-head">
        <h2>Surprise Meter</h2>
        <span>{surprise}%</span>
      </div>
      <div className="meter-retro" role="meter" aria-label="Model surprise level">
        {Array.from({ length: segmentCount }).map((_, index) => (
          <span
            key={`surprise-segment-${index}`}
            className={index < activeSegments ? 'meter-segment active' : 'meter-segment'}
          />
        ))}
      </div>
    </article>
  )
}
