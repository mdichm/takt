// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useState } from 'react';
import { Alerte } from '../atoms/Alerte';
import { Bouton } from '../atoms/Bouton';
import { Checkbox } from '../atoms/Checkbox';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { EtatDonnees, VarianteInput } from '../types';

interface Entite {
  readonly id: string;
  readonly nom: string;
  readonly email: string;
  readonly role: string;
  readonly departement: string;
  readonly actif: boolean;
}

interface FormulaireEntiteProps {
  readonly entite?: Entite | null;
  readonly onSubmit: (donnees: Entite) => void;
  readonly onAnnuler: () => void;
  readonly chargement?: boolean;
}

export function FormulaireEntite({
  entite,
  onSubmit,
  onAnnuler,
  chargement = false,
}: FormulaireEntiteProps): JSX.Element {
  const [donnees, setDonnees] = useState<Entite>({
    id: entite?.id ?? '',
    nom: entite?.nom ?? '',
    email: entite?.email ?? '',
    role: entite?.role ?? '',
    departement: entite?.departement ?? '',
    actif: entite?.actif ?? true,
  });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [etat, setEtat] = useState<EtatDonnees>('vide');

  const validerChamp = useCallback(
    (nom: string, valeur: string): { estValide: boolean; message?: string } => {
      if (!valeur.trim()) return { estValide: false, message: 'Ce champ est obligatoire' };
      if (nom === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeur)) {
        return { estValide: false, message: 'Email invalide' };
      }
      return { estValide: true };
    },
    [],
  );

  const validerTout = useCallback((): boolean => {
    const next: Record<string, string> = {};
    let valide = true;
    const verifier = (cle: string, valeur: string) => {
      const r = validerChamp(cle, valeur);
      if (!r.estValide) {
        next[cle] = r.message!;
        valide = false;
      }
    };
    verifier('nom', donnees.nom);
    verifier('email', donnees.email);
    verifier('role', donnees.role);
    verifier('departement', donnees.departement);
    setErreurs(next);
    return valide;
  }, [donnees, validerChamp]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validerTout()) {
        setEtat('erreur');
        return;
      }
      setEtat('chargement');
      onSubmit(donnees);
    },
    [donnees, validerTout, onSubmit],
  );

  const handleChange = useCallback(
    (cle: keyof Entite, valeur: string) => {
      setDonnees((prev) => ({ ...prev, [cle]: valeur }));
      if (erreurs[cle])
        setErreurs((prev) => {
          const n = { ...prev };
          delete n[cle];
          return n;
        });
    },
    [erreurs],
  );

  const variantes: {
    nom: VarianteInput;
    email: VarianteInput;
    role: VarianteInput;
    departement: VarianteInput;
  } = {
    nom: erreurs.nom ? 'erreur' : 'défaut',
    email: erreurs.email ? 'erreur' : 'défaut',
    role: erreurs.role ? 'erreur' : 'défaut',
    departement: erreurs.departement ? 'erreur' : 'défaut',
  };

  return (
    <form
      role="form"
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}
    >
      {etat === 'erreur' && (
        <Alerte
          variante="erreur"
          titre="Erreurs de saisie"
          message="Veuillez corriger les champs surlignés."
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-m)' }}>
        <Input
          id="input-nom"
          label="Nom"
          value={donnees.nom}
          variante={variantes.nom}
          messageErreur={erreurs.nom ?? ''}
          disabled={chargement}
          onChange={(v) => handleChange('nom', v)}
          required
        />
        <Input
          id="input-email"
          label="Email"
          type="email"
          value={donnees.email}
          variante={variantes.email}
          messageErreur={erreurs.email ?? ''}
          disabled={chargement}
          onChange={(v) => handleChange('email', v)}
          required
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-m)' }}>
        <Select
          id="select-role"
          label="Rôle"
          options={[
            { valeur: 'enseignant', libelle: 'Enseignant' },
            { valeur: 'gestionnaire', libelle: 'Gestionnaire' },
            { valeur: 'administrateur', libelle: 'Administrateur' },
          ]}
          value={donnees.role}
          variante={variantes.role}
          messageErreur={erreurs.role ?? ''}
          disabled={chargement}
          onChange={(v) => handleChange('role', v)}
          required
        />
        <Select
          id="select-departement"
          label="Département"
          options={[
            { valeur: 'info', libelle: 'Informatique' },
            { valeur: 'math', libelle: 'Mathématiques' },
            { valeur: 'physique', libelle: 'Physique' },
          ]}
          value={donnees.departement}
          variante={variantes.departement}
          messageErreur={erreurs.departement ?? ''}
          disabled={chargement}
          onChange={(v) => handleChange('departement', v)}
          required
        />
      </div>
      <Checkbox
        id="checkbox-actif"
        label="Compte actif"
        checked={donnees.actif}
        disabled={chargement}
        onChange={(c) => setDonnees((prev) => ({ ...prev, actif: c }))}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-s)',
          marginTop: 'var(--space-s)',
        }}
      >
        <Bouton
          variante="contour"
          taille="moyenne"
          disabled={chargement}
          onClick={onAnnuler}
          libelle="Annuler"
        />
        <Bouton
          variante="primaire"
          taille="moyenne"
          disabled={chargement}
          chargement={chargement}
          type="submit"
          libelle="Enregistrer"
        />
      </div>
    </form>
  );
}
