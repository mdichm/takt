// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bouton } from '@/components/atoms/Bouton';
import { Alerte } from '@/components/atoms/Alerte';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { api } from '@/lib/api';
import { versMessageActionnable, type ErreurApi } from '@/lib/errors';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import { zInitialisationInput, type CodeErreurApi } from '@takt/contracts';
import type { InitialisationInput } from '@takt/contracts';

const DICO = DICTIONNAIRE_FR.ges.initialisation as Record<string, string | Record<string, string>>;

function t(cle: string): string {
  const valeur = DICO[cle];
  return typeof valeur === 'string' ? valeur : cle;
}

export default function ECGes01Page(): JSX.Element {
  const navigate = useNavigate();
  const [chargement, setChargement] = useState(false);
  const [erreurApi, setErreurApi] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [montreConfirmation, setMontreConfirmation] = useState(false);

  const [donnees, setDonnees] = useState<InitialisationInput>({
    libelleAnnee: '',
    numeroSemestre: 1,
    dateDebutAnnee: '',
    dateFinAnnee: '',
    dateDebutSemestre: '',
    dateFinSemestre: '',
  });

  const [champsInvalides, setChampsInvalides] = useState<Record<string, string>>({});

  const gererChangement = useCallback(
    (cle: keyof InitialisationInput, valeur: string): void => {
      setChampsInvalides({});
      setErreurApi(null);
      setSucces(null);
      setDonnees((prec) => ({ ...prec, [cle]: valeur }));
    },
    [],
  );

  const gererChangementNumero = useCallback((valeur: string): void => {
    const num = parseInt(valeur, 10);
    if (num === 1 || num === 2) {
      setChampsInvalides({});
      setDonnees((prec) => ({ ...prec, numeroSemestre: num }));
    }
  }, []);

  const validerFormulaire = useCallback((): boolean => {
    const erreurs: Record<string, string> = {};
    const parsed = zInitialisationInput.safeParse(donnees);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const chemin = issue.path.join('.');
        erreurs[chemin] = issue.message;
      }
      setChampsInvalides(erreurs);
      return false;
    }
    return true;
  }, [donnees]);

  const gererSoumission = async (): Promise<void> => {
    if (!validerFormulaire()) {
      return;
    }
    setChargement(true);
    setErreurApi(null);
    try {
      const reponse = await api.post<{ data: unknown }>(
        '/versions/initialisation',
        donnees,
        { schema: zInitialisationInput },
      );
      if (reponse.data) {
        setSucces(t('succes'));
        setDonnees({
          libelleAnnee: '',
          numeroSemestre: 1,
          dateDebutAnnee: '',
          dateFinAnnee: '',
          dateDebutSemestre: '',
          dateFinSemestre: '',
        });
        setMontreConfirmation(false);
        navigate('/dashboard', { replace: false });
      }
    } catch (err) {
      if (err instanceof Error && 'statut' in err && 'code' in err) {
        const e = err as { statut: number; code: string; message?: string };
        if (e.statut === 409 && e.code === 'WORKFLOW_INVALID_TRANSITION') {
          setErreurApi(t('erreurDejaInitialise'));
        } else {
          const erreurApi: ErreurApi = {
            code: e.code as CodeErreurApi,
            statut: e.statut,
            message: e.message ?? t('erreur'),
          };
          setErreurApi(versMessageActionnable(erreurApi));
        }
      } else {
        setErreurApi(t('erreur'));
      }
    } finally {
      setChargement(false);
    }
  };

  const gererConfirmation = (confirmer: boolean): void => {
    if (!confirmer) {
      setMontreConfirmation(false);
      return;
    }
    setMontreConfirmation(false);
    void gererSoumission();
  };

  const optionsSemestre = [
    { valeur: '1', libelle: 'Semestre 1' },
    { valeur: '2', libelle: 'Semestre 2' },
  ];

  const contenu = (
    <section style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--space-m)' }}>
      <header style={{ marginBottom: 'var(--space-l)' }}>
        <h1 style={{ fontSize: 'var(--font-size-h2)', margin: '0 0 var(--space-xs) 0', color: 'var(--color-text-primary)' }}>
          {t('titre')}
        </h1>
        <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', margin: 0 }}>
          {t('sousTitre')}
        </p>
      </header>

      {succes && (
        <Alerte variante="succès" titre={t('alerte.succès')} message={succes} fermable onFermer={() => setSucces(null)} />
      )}

      {erreurApi && (
        <Alerte variante="erreur" titre={t('alerte.erreur')} message={erreurApi} fermable onFermer={() => setErreurApi(null)} />
      )}

      {!montreConfirmation && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMontreConfirmation(true);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}
        >
          <Input
            label={t('libelleAnnee')}
            placeholder={t('libelleAnneeAide')}
            value={donnees.libelleAnnee}
            onChange={(v) => gererChangement('libelleAnnee', v)}
            variante={champsInvalides.libelleAnnee ? 'erreur' : 'défaut'}
            messageErreur={champsInvalides.libelleAnnee}
            required
          />
          <Select
            label={t('numeroSemestre')}
            options={optionsSemestre}
            value={String(donnees.numeroSemestre)}
            onChange={gererChangementNumero}
            variante={champsInvalides.numeroSemestre ? 'erreur' : 'défaut'}
            messageErreur={champsInvalides.numeroSemestre}
            required
          />
          <Input
            label={t('dateDebutAnnee')}
            type="date"
            value={donnees.dateDebutAnnee}
            onChange={(v) => gererChangement('dateDebutAnnee', v)}
            variante={champsInvalides.dateDebutAnnee ? 'erreur' : 'défaut'}
            messageErreur={champsInvalides.dateDebutAnnee}
            required
          />
          <Input
            label={t('dateFinAnnee')}
            type="date"
            value={donnees.dateFinAnnee}
            onChange={(v) => gererChangement('dateFinAnnee', v)}
            variante={champsInvalides.dateFinAnnee ? 'erreur' : 'défaut'}
            messageErreur={champsInvalides.dateFinAnnee}
            required
          />
          <Input
            label={t('dateDebutSemestre')}
            type="date"
            value={donnees.dateDebutSemestre}
            onChange={(v) => gererChangement('dateDebutSemestre', v)}
            variante={champsInvalides.dateDebutSemestre ? 'erreur' : 'défaut'}
            messageErreur={champsInvalides.dateDebutSemestre}
            required
          />
          <Input
            label={t('dateFinSemestre')}
            type="date"
            value={donnees.dateFinSemestre}
            onChange={(v) => gererChangement('dateFinSemestre', v)}
            variante={champsInvalides.dateFinSemestre ? 'erreur' : 'défaut'}
            messageErreur={champsInvalides.dateFinSemestre}
            required
          />
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-s)',
              marginTop: 'var(--space-s)',
              padding: 'var(--space-m)',
              border: `var(--border-width) solid var(--color-border)`,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-variant)',
            }}
          >
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>
                {t('confirmation.titre')}
              </strong>
              <p style={{ fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)', margin: 'var(--space-xs) 0 0 0' }}>
                {t('confirmation.message')}
              </p>
              <p style={{ fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)', margin: 'var(--space-xs) 0 0 0' }}>
                {t('confirmation.verrouillage')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-s)', marginTop: 'var(--space-m)' }}>
              <Bouton
                variante="danger"
                libelle={t('confirmation.annuler')}
                onClick={() => setMontreConfirmation(false)}
                taille="petite"
              />
              <Bouton
                libelle={t('confirmation.confirmer')}
                onClick={() => gererConfirmation(true)}
                taille="petite"
              />
            </div>
          </div>
        </form>
      )}

      <footer style={{ marginTop: 'var(--space-l)', textAlign: 'right' }}>
        <Bouton
          variante="contour"
          libelle={t('boutonAnnuler')}
          onClick={() => navigate('/dashboard')}
          taille="petite"
        />
      </footer>
    </section>
  );

  if (chargement) {
    return <EtatChargement libelle="Initialisation en cours…" />;
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: 'var(--space-m)', borderBottom: `var(--border-width) solid var(--color-border)` }}>
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>EC-GES-01</span>
      </header>
      <section style={{ flex: 1 }}>{contenu}</section>
    </main>
  );
}