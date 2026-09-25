// Renders one input per entry in `schema.fields`. To adapt this page
// to a different simulation, you only need to edit
// data/parameters.example.json — this component never needs to change.
export default function ParametersPanel({ schema, values, onChange }) {
  return (
    <form className="parameters-panel" onSubmit={(event) => event.preventDefault()}>
      <h2 className="parameters-panel__title">Parâmetros</h2>
      <p className="parameters-panel__hint">
        Campos de exemplo — edite <code>data/parameters.example.json</code> para os
        parâmetros reais de cada simulação.
      </p>

      {schema.fields.map((field) => (
        <label
          key={field.id}
          className="parameters-panel__field"
          title={field.disabled ? 'Ainda sem efeito na simulação — valor fixo no backend' : undefined}
        >
          <span className="parameters-panel__label">
            {field.label}
            {field.unit && <span className="parameters-panel__unit"> ({field.unit})</span>}
          </span>

          {field.type === 'select' ? (
            <select
              value={values[field.id] ?? field.default}
              onChange={(event) => onChange(field.id, event.target.value)}
              disabled={field.disabled}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={values[field.id] ?? field.default}
              onChange={(event) => onChange(field.id, Number(event.target.value))}
              disabled={field.disabled}
            />
          )}
        </label>
      ))}
    </form>
  );
}
