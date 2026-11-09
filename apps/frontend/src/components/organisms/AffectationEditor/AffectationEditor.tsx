// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';
import { Bouton } from '../../atoms/Bouton';
import { Input } from '../../atoms/Input';
import { Badge } from '../../atoms/Badge';
import { Alerte } from '../../atoms/Alerte';
import { IndicateurCharge } from '../IndicateurCharge';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import type { AffectationPedagogique } from '@takt/contracts';

/*──────────────────────────────────────────────────────────────────────────────
  Schéma de validation du formulaire d'affectation (GG-05 : Zod uniquement)
──────────────────────────────────────────────────────────────────────────────*/

const zFormulaireAffectation = z.object({
  enseignantId: z.string().min(1, 'Sélectionnez un enseignant.'),
  matiereId: z.string().min(1, 'Sélectionnez une matière.'),
  groupeId: z.string().min(1, 'Sélectionnez un groupe.'),
  typeEnseignementId: z.string().nullable().optional(),
  volumeHebdo: z
    .string()
    .min(1, 'Le volume horaire est obligatoire.')
    .refine(
      (val) => {
        const n = Number(val);
        return !isNaN(n) && n > 0;
      },
      { message: 'Le volume horaire doit être strictement positif.' },
    ),
});

type DonneesFormulaire = z.infer<typeof zFormulaireAffectation>;

interface ReferentielSimple {
  readonly id: string;
  readonly code: string;
  readonly libelle: string;
}

interface AffectationEditorProps {
  readonly affectation: AffectationPedagogique | null;
  readonly enseignants: readonly ReferentielSimple[];
  readonly matieres: readonly ReferentielSimple[];
  readonly groupes: readonly ReferentielSimple[];
  readonly typesEnseignement: readonly ReferentielSimple[];
  readonly chargeEnseignant?: {
    chargeArrondie: number;
    cible: number;
    taux: number;
    statut: 'CONFORME' | 'AVERTISSEMENT' | 'BLOQUANT';
    depassePlafond: boolean;
  } | null;
  readonly lectureSeule?: boolean;
  readonly chargement?: boolean;
  readonly erreur?: string | null;
  readonly surSoumettre: (donnees: DonneesFormulaire) => void | Promise<void>;
  readonly surAnnuler: () => void;
}

/** Formulaire de saisie / modification d'une affectation pédagogique. */
export function AffectationEditor({
  affectation,
  chargeEnseignant,
  lectureSeule = false,
  chargement = false,
  erreur,
  surSoumettre,
  surAnnuler,
}: AffectationEditorProps): JSX.Element {
  const dictBouton = traduction('bouton') as (typeof DICTIONNAIRE_FR)['bouton'];
  const [donnees, setDonnees] = useState<DonneesFormulaire>({
    enseignantId: affectation?.enseignantId ?? '',
    matiereId: affectation?.matiereId ?? '',
    groupeId: affectation?.groupeId ?? '',
    typeEnseignementId: affectation?.typeEnseignementId ?? null,
    volumeHebdo: affectation?.volumeHebdo?.toString() ?? '',
  });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [soumissionEnCours, setSoumissionEnCours] = useState(false);
  const estModification = affectation !== null;
  const titre = estModification ? 'Modifier l’affectation' : 'Nouvelle affectation';
  const validerChamp = useCallback(
    (cle: keyof DonneesFormulaire, valeur: string | null) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ = zFormulaireAffectation.shape[cle].parse(valeur ?? '');
        setErreurs((prev) => {
          const suivante = { ...prev };
          delete suivante[cle];
          return suivante;
        });
      } catch {
        // Gérée à la soumission globale.
      }
    },
    [],
  );

  const gererChangement = useCallback(
    (cle: keyof DonneesFormulaire) => (valeur: string) => {
      setDonnees((prev) => ({ ...prev, [cle]: valeur }));
      validerChamp(cle, valeur);
    },
    [validerChamp],
  );

  const gererSoumission = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      try {
        zFormulaireAffectation.parse(donnees);
        setErreurs({});
        setSoumissionEnCours(true);
        const resultat = surSoumettre(donnees);
        if (resultat && typeof resultat.then === 'function') {
          void resultat.finally(() => setSoumissionEnCours(false));
        } else {
          setSoumissionEnCours(false);
        }
      } catch (erreurZod) {
        const erreursChamps: Record<string, string> = {};
        if (erreurZod instanceof z.ZodError) {
          for (const issue of erreurZod.issues) {
            const cle = issue.path[0] as keyof DonneesFormulaire;
            erreursChamps[String(cle)] = issue.message;
          }
        }
        setErreurs(erreursChamps);
      }
    },
    [donnees, surSoumettre],
  );
  const badgeCharge = useMemo(() => {
    if (!chargeEnseignant) return null;
    const { statut, taux, chargeArrondie } = chargeEnseignant;
    const variante: 'succès' | 'attention' | 'erreur' =
      statut === 'BLOQUANT' ? 'erreur' : statut === 'AVERTISSEMENT' ? 'attention' : 'succès';
    const libelle =
      statut === 'BLOQUANT'
        ? `Bloquant (${chargeArrondie}h > plafond)`
        : statut === 'AVERTISSEMENT'
          ? `Seuil atteint (${taux.toFixed(0)}%)`
          : `Conforme (${taux.toFixed(0)}%)`;
    return <Badge variante={variante} libelle={libelle} />;
  }, [chargeEnseignant]);
  return (
    <section
      data-testid="affectation-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-m)',
        padding: 'var(--space-m)',
        border: `var(--border-width) solid var(--color-border)`,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-s)',
        }}
      >
        <h3
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: 0,
            color: 'var(--color-text-primary)',
          }}
        >
          {titre}
        </h3>
        {chargeEnseignant && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Charge enseignant :
            </span>
            {badgeCharge}
          </div>
        )}
      </header>

      {erreur && (
        <Alerte variante="erreur" titre="Erreur" message={erreur} fermable={true} />
      )}

      <form
        onSubmit={gererSoumission}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-m)',
          }}
        >
          <Input
            label="Enseignant"
            value={donnees.enseignantId}
            onChange={gererChangement('enseignantId')}
            disabled={lectureSeule || chargement}
            required
            messageErreur={erreurs.enseignantId}
          />
          <Input
            label="Matière"
            value={donnees.matiereId}
            onChange={gererChangement('matiereId')}
            disabled={lectureSeule || chargement}
            required
            messageErreur={erreurs.matiereId}
          />
          <Input
            label="Groupe"
            value={donnees.groupeId}
            onChange={gererChangement('groupeId')}
            disabled={lectureSeule || chargement}
            required
            messageErreur={erreurs.groupeId}
          />
          <Input
            label="Type d'enseignement"
            value={donnees.typeEnseignementId ?? ''}
            onChange={gererChangement('typeEnseignementId')}
            disabled={lectureSeule || chargement}
            messageErreur={erreurs.typeEnseignementId}
          />
        </div>

        <Input
          label="Volume horaire hebdomadaire (h)"
          type="number"
          value={donnees.volumeHebdo}
          onChange={gererChangement('volumeHebdo')}
          disabled={lectureSeule || chargement}
          required
          messageErreur={erreurs.volumeHebdo}
        />

        {chargeEnseignant && (
          <IndicateurCharge
            label="Charge hebdomadaire enseignant"
            valeur={chargeEnseignant.chargeArrondie}
            max={chargeEnseignant.cible}
            chargement={chargement}
          />
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-s)',
            marginTop: 'var(--space-xs)',
          }}
        >
          <Bouton
            variante="fantome"
            taille="moyenne"
            disabled={lectureSeule || chargement || soumissionEnCours}
            onClick={surAnnuler}
            libelle={dictBouton.annuler}
          />
          <Bouton
            variante="primaire"
            taille="moyenne"
            disabled={lectureSeule || chargement || soumissionEnCours}
            type="submit"
            chargement={soumissionEnCours}
            libelle={estModification ? dictBouton.modifier : dictBouton.ajouter}
          />
        </div>
      </form>
    </section>
  );
}