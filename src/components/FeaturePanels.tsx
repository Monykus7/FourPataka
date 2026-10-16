import { useMemo } from 'react';
import { featureModules } from '../modules/assembly';
import type { FeaturePlacement, FeatureSnapshot, FeatureRequest } from '../modules';
import type { FeatureSettings } from '../core/featureHost';

export default function FeaturePanels({
  placement,
  snapshot,
  saved,
  visibility,
  onVisibility,
  onSettings,
  onRequest,
  onError,
}: {
  placement: FeaturePlacement;
  snapshot: FeatureSnapshot;
  saved: FeatureSettings;
  visibility: Record<string, boolean>;
  onVisibility: (id: string, visible: boolean) => void;
  onSettings: (id: string, settings: unknown, group?: string) => void;
  onRequest: (id: string, request: FeatureRequest) => void;
  onError: (message: string) => void;
}) {
  const definitions = useMemo(
    () => featureModules.definitions.filter((d) => d.placement === placement),
    [placement],
  );
  const unavailable = Object.entries(saved).filter(
    ([id]) => !featureModules.definitions.some((d) => d.id === id),
  );
  const models = useMemo(
    () =>
      definitions
        .filter((d) => visibility[d.id] !== false)
        .map((d) => {
          const entry = saved[d.id];
          const settings = entry?.settings ?? d.defaults();
          try {
            return {
              d,
              settings,
              model: entry?.unavailable ? null : d.view(snapshot, settings),
              error: entry?.unavailable,
            };
          } catch (error) {
            return { d, settings, model: null, error: (error as Error).message };
          }
        }),
    [definitions, saved, snapshot, visibility],
  );
  if (!definitions.length && (placement !== 'learn' || !unavailable.length)) return null;
  return (
    <div className="feature-workspace">
      {!!definitions.length && (
        <fieldset className="feature-visibility">
          <legend>Panels</legend>
          {definitions.map((d) => (
            <label key={d.id}>
              <input
                type="checkbox"
                aria-label={`Show ${d.label}`}
                checked={visibility[d.id] !== false}
                onChange={(e) => onVisibility(d.id, e.target.checked)}
              />
              {d.label}
            </label>
          ))}
        </fieldset>
      )}
      {models.map(({ d, settings, model, error }) => {
        const Panel = d.collapsedByDefault ? 'details' : 'section';
        const Heading = d.collapsedByDefault ? 'summary' : 'div';
        const action = (id: string) => {
          try {
            onRequest(d.id, d.action(id, snapshot, settings));
          } catch (error) {
            onError((error as Error).message);
          }
        };
        const button = (b: { id: string; label: string; disabled?: boolean }) => (
          <button
            key={b.id}
            className="secondary-button"
            disabled={b.disabled}
            onClick={() => action(b.id)}
          >
            {b.label}
          </button>
        );
        return (
          <Panel className="panel feature-panel" key={d.id} aria-label={d.label}>
            <Heading className="section-title">
              <h2>{d.label}</h2>
            </Heading>
            {error ? (
              <>
                <p role="alert">{error}. Original feature settings are preserved.</p>
                <button className="secondary-button" onClick={() => onSettings(d.id, d.defaults())}>
                  Reset {d.label} settings
                </button>
              </>
            ) : (
              model && (
                <>
                  {model.description && <p>{model.description}</p>}
                  {Object.entries(d.parameters ?? {}).map(([key, parameter]) => {
                    const value = (settings as Record<string, number>)[key];
                    const edit = (n: number) => {
                      try {
                        onSettings(
                          d.id,
                          { ...(settings as object), [key]: n },
                          `feature:${d.id}:${key}`,
                        );
                      } catch (error) {
                        onError((error as Error).message);
                      }
                    };
                    return (
                      <label className="feature-control" key={key}>
                        {parameter.label} <small>{parameter.unit}</small>
                        <input
                          type="range"
                          aria-label={`${d.label} ${parameter.label}`}
                          min={parameter.min}
                          max={parameter.max}
                          step={parameter.step}
                          value={value}
                          onChange={(e) => edit(Number(e.target.value))}
                        />
                        <input
                          type="number"
                          aria-label={`${d.label} ${parameter.label} exact value`}
                          min={parameter.min}
                          max={parameter.max}
                          step={parameter.step}
                          value={value}
                          onChange={(e) => {
                            if (e.target.value !== '') edit(Number(e.target.value));
                          }}
                        />
                      </label>
                    );
                  })}
                  {model.cards && (
                    <div className="experiment-grid">
                      {model.cards.map((card) => (
                        <section className="panel experiment-card" key={card.action.id}>
                          <h3>{card.title}</h3>
                          <p>{card.text}</p>
                          {button(card.action)}
                        </section>
                      ))}
                    </div>
                  )}
                  {model.metricsTitle && <h3>{model.metricsTitle}</h3>}
                  {model.metrics && (
                    <dl className="analysis-metrics">
                      {model.metrics.map((metric) => (
                        <div key={metric.label}>
                          <dt>{metric.label}</dt>
                          <dd>{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {model.note && <p className="footnote">{model.note}</p>}
                  {model.metricGroups?.map((group) => (
                    <section
                      className="feature-metric-group"
                      key={group.title}
                      aria-label={group.title}
                    >
                      <h3>{group.title}</h3>
                      <dl className="analysis-metrics">
                        {group.metrics.map((metric) => (
                          <div key={metric.label}>
                            <dt>{metric.label}</dt>
                            <dd>{metric.value}</dd>
                          </div>
                        ))}
                      </dl>
                      {group.note && <p className="footnote">{group.note}</p>}
                    </section>
                  ))}
                  <div className="button-group">{model.actions?.map(button)}</div>
                </>
              )
            )}
          </Panel>
        );
      })}
      {placement === 'learn' &&
        unavailable.map(([id, entry]) => (
          <section className="panel feature-panel" key={id}>
            <h3>Unavailable feature</h3>
            <p>
              {id}: {entry.unavailable ?? 'Feature is not installed'}. Saved settings are preserved.
            </p>
          </section>
        ))}
    </div>
  );
}
