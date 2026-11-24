import { useId, useState } from 'react';

// Um campo por item de `schema.fields` (data/parameters.example.json) —
// pra outra simulação, basta editar o JSON; este componente não muda.
//
// Campos numéricos usam o NumberField abaixo em vez do <input type="number">
// nativo, que tinha vários problemas: as setinhas do navegador (claras e
// minúsculas no tema escuro), o valor virava 0 ao apagar o campo, a
// rodinha do mouse mudava o número sem querer, e o navegador acusava
// "valor inválido" quando o número não batia com o `step`.
//
// Campos aceitos no JSON pra números: step (passo dos botões − e +),
// integer, positive (só aceita > 0), min/max (opcionais — sem eles não há
// limite), unit, disabled. Valor inválido não vai pra simulação: a borda
// fica vermelha e, ao sair do campo, volta o último valor válido.
export default function ParametersPanel({ schema, values, onChange }) {
  return (
    <form className="parameters-panel" onSubmit={(event) => event.preventDefault()}>
      <h2 className="parameters-panel__title">Parâmetros</h2>

      {schema.fields.map((field) =>
        field.type === 'select' ? (
          <SelectField
            key={field.id}
            field={field}
            value={values[field.id] ?? field.default}
            onChange={(value) => onChange(field.id, value)}
          />
        ) : (
          <NumberField
            key={field.id}
            field={field}
            value={values[field.id] ?? field.default}
            onChange={(value) => onChange(field.id, value)}
          />
        ),
      )}
    </form>
  );
}

// `showUnit`: nos campos numéricos a unidade já aparece dentro da caixa.
function FieldLabel({ field, htmlFor, showUnit = true }) {
  return (
    <label className="parameters-panel__label" htmlFor={htmlFor}>
      {field.label}
      {showUnit && field.unit && <span className="parameters-panel__unit"> ({field.unit})</span>}
    </label>
  );
}

function SelectField({ field, value, onChange }) {
  const id = useId();
  const selectedWarning = field.options.find((option) => option.value === value)?.warning;
  return (
    <div
      className="parameters-panel__field"
      title={field.disabled ? 'Ainda sem efeito na simulação — valor fixo no backend' : undefined}
    >
      <FieldLabel field={field} htmlFor={id} />
      <select
        id={id}
        className="parameters-panel__select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={field.disabled}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {/* Aviso opcional da opção escolhida (`warning` na opção, no JSON de
          parâmetros) — ex. isótopos do PET usados em outro tipo de exame. */}
      {selectedWarning && (
        <p className="parameters-panel__warning" role="status">
          <span aria-hidden="true">⚠ </span>
          {selectedWarning}
        </p>
      )}
    </div>
  );
}

// Aceita vírgula ou ponto como separador decimal ("2,5" ou "2.5").
function parseNumber(text) {
  const cleaned = String(text).trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '.' || cleaned === '-') return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

// true = valor pode ir pra simulação.
function isValid(number, field) {
  if (number === null) return false;
  if (field.integer && !Number.isInteger(number)) return false;
  if (field.positive && number <= 0) return false;
  if (field.min !== undefined && number < field.min) return false;
  if (field.max !== undefined && number > field.max) return false;
  return true;
}

// Mostra o número no jeito brasileiro (vírgula decimal) sem separador de
// milhar dentro do campo, pra ficar fácil de editar.
function toText(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace('.', ',');
}

function clamp(number, field) {
  let result = number;
  if (field.min !== undefined) result = Math.max(field.min, result);
  if (field.max !== undefined) result = Math.min(field.max, result);
  // Evita 0,30000000000000004 depois de somar passos decimais.
  return Number(result.toFixed(6));
}

function NumberField({ field, value, onChange }) {
  const id = useId();
  const [draft, setDraft] = useState(toText(value));
  const [editing, setEditing] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Valor mudou de fora (botões, atalhos, reset) e o campo não está sendo
  // editado: mostra o valor novo.
  if (!editing && value !== lastValue) {
    setLastValue(value);
    setDraft(toText(value));
  }

  const parsed = parseNumber(draft);
  const error = (editing || draft !== toText(value)) && !isValid(parsed, field);
  const step = field.step ?? 1;
  const disabled = Boolean(field.disabled);

  function commit(text) {
    const number = parseNumber(text);
    if (isValid(number, field)) onChange(number);
  }

  function nudge(direction) {
    const fallback = Number.isFinite(Number(value)) ? Number(value) : 0;
    const base = parseNumber(draft) ?? fallback;
    // Abaixo de um passo, o passo vira um décimo (ex.: energia 1 → 0,9 →
    // 0,8 MeV), senão o "−" pularia direto pro mínimo.
    const small = !field.integer && step >= 1 && (direction < 0 ? base <= step : base < step);
    const size = small ? step / 10 : step;
    const next = clamp(base + direction * size, field);
    if (!isValid(next, field)) return; // ex.: "−" chegando a zero
    setDraft(toText(next));
    onChange(next);
  }

  const atMin = field.min !== undefined && Number(value) <= field.min;
  const atMax = field.max !== undefined && Number(value) >= field.max;

  return (
    <div
      className="parameters-panel__field"
      title={disabled ? 'Ainda sem efeito na simulação — valor fixo no backend' : undefined}
    >
      <FieldLabel field={field} htmlFor={id} showUnit={false} />

      <div className={`number-field${error ? ' has-error' : ''}${disabled ? ' is-disabled' : ''}`}>
        <button
          type="button"
          className="number-field__step"
          onClick={() => nudge(-1)}
          disabled={disabled || atMin}
          aria-label={`Diminuir ${field.label.toLowerCase()}`}
          tabIndex={-1}
        >
          −
        </button>
        <input
          id={id}
          className="number-field__input"
          type="text"
          inputMode={field.integer ? 'numeric' : 'decimal'}
          autoComplete="off"
          value={draft}
          disabled={disabled}
          aria-invalid={error}
          onFocus={() => setEditing(true)}
          onChange={(event) => {
            setDraft(event.target.value);
            commit(event.target.value);
          }}
          onBlur={() => {
            setEditing(false);
            // Valor inválido ao sair do campo: volta pro último válido.
            if (!isValid(parseNumber(draft), field)) setDraft(toText(value));
            else setDraft(toText(parseNumber(draft)));
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              nudge(1);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
        />
        {field.unit && <span className="number-field__unit">{field.unit}</span>}
        <button
          type="button"
          className="number-field__step"
          onClick={() => nudge(1)}
          disabled={disabled || atMax}
          aria-label={`Aumentar ${field.label.toLowerCase()}`}
          tabIndex={-1}
        >
          +
        </button>
      </div>

    </div>
  );
}
