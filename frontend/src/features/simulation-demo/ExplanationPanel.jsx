import { useEffect, useRef } from 'react';

function Block({ block }) {
  if (block.type === 'list') {
    return (
      <ul className="explanation-panel__list">
        {block.items.map((item) => (
          <li key={item.label}>
            <strong>{item.label}:</strong> {item.text}
          </li>
        ))}
      </ul>
    );
  }

  return <p>{block.text}</p>;
}

/**
 * Modal with the three explanatory fields justified in the article
 * (historical context, physics foundations, results interpretation).
 * Content is data-driven from data/explanations.example.json — to
 * adapt this to a different simulation, edit that file only, this
 * component never needs to change.
 */
export default function ExplanationPanel({ schema, isOpen, onClose }) {
  const dialogRef = useRef(null);

  // Close on Escape, and move focus into the dialog when it opens so
  // keyboard/screen-reader users land somewhere sensible.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="explanation-panel__backdrop" onClick={onClose}>
      <div
        className="explanation-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="explanation-panel-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="explanation-panel__header">
          <h2 id="explanation-panel-title">{schema.title}</h2>
          <button
            type="button"
            className="explanation-panel__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="explanation-panel__body">
          {schema.sections.map((section) => (
            <section key={section.id} className="explanation-panel__section">
              <h3>{section.heading}</h3>
              {section.blocks.map((block, index) => (
                <Block key={index} block={block} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
