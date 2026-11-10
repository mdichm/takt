// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bouton } from '../atoms/Bouton';
import { Icone } from '../atoms/Icone';
import { PropsBase } from '../types';

interface ModalProps extends PropsBase {
  /** Si la modal est ouverte. */
  readonly ouvert: boolean;
  /** Titre de la modal. */
  readonly titre: string;
  /** Gestionnaire de fermeture. */
  readonly onFermer: () => void;
  /** Contenu affiché dans le corps de la modal. */
  readonly children?: React.ReactNode;
  /** Libellé du bouton de validation (optionnel). */
  readonly libelleValider?: string;
  /** Gestionnaire de validation (optionnel). */
  readonly onValider?: () => void;
}

/** Fenêtre modale accessible : focus trap, Échap, retour du focus à la fermeture. */
export function Modal({
  ouvert,
  titre,
  onFermer,
  children,
  libelleValider,
  onValider,
  className,
}: ModalProps): JSX.Element | null {
  const [montage, setMontage] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  const fermer = useCallback(() => {
    setMontage(false);
    onFermer();
  }, [onFermer]);

  // Gestion du focus trap et de la touche Échap
  useEffect(() => {
    if (!ouvert) return;

    // Enregistre l'élément déclencheur pour restaurer le focus plus tard
    const actif = document.activeElement as HTMLElement | null;
    triggerRef.current = actif;

    const dialog = dialogRef.current;
    if (!dialog) return;

    setMontage(true);

    // Focus sur le premier élément focusable de la modal
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length > 0) {
      firstFocusableRef.current = focusables[0] ?? null;
      lastFocusableRef.current = focusables[focusables.length - 1] ?? null;
      focusables[0]?.focus();
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fermer();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          if (document.activeElement === firstFocusableRef.current) {
            lastFocusableRef.current?.focus();
          } else {
            (
              (document.activeElement as HTMLElement)?.previousElementSibling as HTMLElement | null
            )?.focus();
          }
        } else {
          if (document.activeElement === lastFocusableRef.current) {
            firstFocusableRef.current?.focus();
          } else {
            (
              (document.activeElement as HTMLElement)?.nextElementSibling as HTMLElement | null
            )?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      // Restaure le focus sur le déclencheur
      triggerRef.current?.focus();
      setMontage(false);
    };
  }, [ouvert, fermer]);

  if (!ouvert && !montage) return null;

  return (
    <>
      {/* Overlay */}
      <div
        role="presentation"
        onClick={fermer}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-text-primary)',
          opacity: 0.4,
          zIndex: 'var(--z-modal)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-l)',
        }}
      >
        {/* Dialog */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-titre"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(90vw, 560px)',
            maxHeight: '90vh',
            overflow: 'auto',
            background: 'var(--color-surface)',
            border: `var(--border-width) solid var(--color-border)`,
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-l)',
            color: 'var(--color-text-primary)',
            boxShadow: 'var(--shadow-lg)',
          }}
          className={className}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-m)',
            }}
          >
            <h2
              id="modal-titre"
              style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, margin: 0 }}
            >
              {titre}
            </h2>
            <Bouton
              variante="fantome"
              taille="petite"
              libelle="Fermer"
              onClick={fermer}
              aria-label="Fermer la modal"
            >
              <Icone nom="fermer" taille={18} ariaLabel="Fermer" />
            </Bouton>
          </div>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }} data-testid="modal-contenu">
            {children}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-s)',
              marginTop: 'var(--space-m)',
            }}
          >
            {libelleValider && onValider && (
              <Bouton variante="primaire" libelle={libelleValider} onClick={onValider} />
            )}
            <Bouton variante="contour" libelle="Annuler" onClick={fermer} />
          </div>
        </div>
      </div>
    </>
  );
}
