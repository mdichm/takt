// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Alerte } from '../atoms/Alerte';
import { Badge } from '../atoms/Badge';
import { Bouton } from '../atoms/Bouton';
import { Checkbox } from '../atoms/Checkbox';
import { Chip } from '../atoms/Chip';
import { Icone } from '../atoms/Icone';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Spinner } from '../atoms/Spinner';
import { Tooltip } from '../atoms/Tooltip';
import { DataTableRow } from '../molecules/DataTableRow';
import { EtatChargement } from '../molecules/EtatChargement';
import { EtatErreur } from '../molecules/EtatErreur';
import { EtatVide } from '../molecules/EtatVide';
import { FormField } from '../molecules/FormField';
import { Modal } from '../molecules/Modal';
import { Paginator } from '../molecules/Paginator';
import { SearchBar } from '../molecules/SearchBar';
import { Tabs } from '../molecules/Tabs';
import { useState } from 'react';

export function ShowcaseDesignSystem(): JSX.Element {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [valeurInput, setValeurInput] = useState('');
  const [ongletActif, setOngletActif] = useState('a');
  const onglets = [
    { id: 'a', libelle: 'Atomes' },
    { id: 'b', libelle: 'Molécules' },
    { id: 'c', libelle: 'Organismes' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-l)', padding: 'var(--space-l)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
        <Icone nom="accueil" taille={32} ariaLabel="Logo TAKT" />
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Design System TAKT</h1>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h2 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Atomes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-m)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)', padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <Bouton variante="primaire" libelle="Primaire" onClick={() => {}} />
            <Bouton variante="contour" libelle="Contour" onClick={() => {}} />
            <Bouton variante="fantome" libelle="Fantôme" onClick={() => {}} />
            <Bouton variante="danger" libelle="Danger" onClick={() => {}} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)', padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <Input label="Texte" value={valeurInput} onChange={(v) => setValeurInput(v)} />
            <Input label="Erreur" value="x" variante="erreur" messageErreur="Invalide" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)', padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <Select label="Sélecteur" options={[{ valeur: 'o1', libelle: 'Option 1' }, { valeur: 'o2', libelle: 'Option 2' }]} value="o1" onChange={() => {}} />
            <Checkbox label="Coché" checked={true} onChange={() => {}} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)', padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <Badge variante="succès" libelle="Succès" />
            <Badge variante="erreur" libelle="Erreur" />
            <Badge variante="attention" libelle="Attention" />
            <Badge variante="info" libelle="Info" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)', padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <Chip libelle="Tag" />
            <Chip libelle="Actif" active={true} />
            <Chip libelle="Suppr" supprimer={true} onSupprimer={() => {}} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)', padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <Spinner ariaLabel="Charge" taille={24} />
            <Alerte variante="info" message="Info" titre="Info" />
            <Alerte variante="erreur" message="Erreur" titre="Erreur" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)', padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <Tooltip contenu="Aide"><span style={{ cursor: 'pointer', color: 'var(--color-primary)' }}>Survolez</span></Tooltip>
          </div>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h2 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Molécules</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-m)' }}>
          <div style={{ padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <FormField label="Nom" value="" onChange={() => {}} />
          </div>
          <div style={{ padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <SearchBar value="" placeholder="Rechercher" onChange={() => {}} onSearch={() => {}} />
          </div>
          <div style={{ padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <table role="grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <DataTableRow cellules={[{ libelle: 'Nom', valeur: 'Alice' }, { libelle: 'Rôle', valeur: 'Ens' }]} />
            </table>
          </div>
          <div style={{ padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <Paginator page={1} total={5} onChange={() => {}} />
          </div>
          <div style={{ padding: 'var(--space-s)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <Tabs onglets={onglets} valeur={ongletActif} onChange={(id) => setOngletActif(id)} />
          </div>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h2 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>États</h2>
        <div style={{ display: 'flex', gap: 'var(--space-m)', flexWrap: 'wrap' }}>
          <EtatVide icone="alerte" message="Aucune donnée" />
          <EtatChargement libelle="Chargement en cours…" />
          <EtatErreur message="Erreur" onReessayer={() => {}} />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h2 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Modal</h2>
        <Bouton variante="primaire" libelle="Ouvrir modal" onClick={() => setModalOuverte(true)} />
        <Modal ouvert={modalOuverte} titre="Modal" onFermer={() => setModalOuverte(false)} libelleValider="Valider" onValider={() => setModalOuverte(false)}>
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>Contenu modal.</p>
        </Modal>
      </section>
    </div>
  );
}