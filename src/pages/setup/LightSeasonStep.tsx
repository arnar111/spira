import { Droplet, Lightbulb, Package } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { SeasonCard } from '@/components/SeasonCard';
import { StepWrap, StepHeader, Field } from './components';
import { inputCls } from './styles';
import type { WizardState } from './useSetupState';

/**
 * Þriðja skrefið greinist eftir staðsetningu (4.4 — sömu þrjú útlit og áður):
 * útiræktun → árstíð, Véritable → tækisfróðleikur, annars → lampaval.
 */
export function LightSeasonStep({
  state,
  set,
  outdoor,
  veritable,
}: {
  state: WizardState;
  set: (patch: Partial<WizardState>) => void;
  outdoor: boolean;
  veritable: boolean;
}) {
  if (outdoor) return <SeasonStep />;
  if (veritable) return <VeritableStep />;
  return <LightStep state={state} set={set} />;
}

function SeasonStep() {
  return (
    <StepWrap>
      <StepHeader
        eyebrow="Árstíð"
        title="Vaxtartíminn úti"
        why="Af því að þú valdir útiræktun sýnum við árstíðar- og frostráð í stað gróðurljósa."
        hint="Útiræktun stýrist af árstíð og frosti — engin gróðurljós þarf."
      />
      <SeasonCard />
      <p className="text-[11.5px] text-cream-300/70 leading-snug mt-3">
        Kartöflur: forspíraðu inni í mars, settu niður seint í maí þegar frosthætta er liðin, og
        taktu upp í september fyrir fyrsta frost. Rós minnir þig á hreykingu og uppskeru þegar þar
        að kemur.
      </p>
    </StepWrap>
  );
}

function VeritableStep() {
  const facts: { icon: typeof Lightbulb; title: string; body: string }[] = [
    {
      icon: Lightbulb,
      title: 'Innbyggt AdaptLight LED',
      body: 'Fast 16/8 prógramm sem kviknar og slokknar sjálfkrafa — engin aukaljós þarf, jafnvel um hávetur.',
    },
    {
      icon: Droplet,
      title: 'Hárpípu-sjálfvökvun',
      body: '2 lítra tankur með kveikjum sem draga vatn upp í ræturnar. Fylltu á 7–14 daga fresti eftir plöntuálagi.',
    },
    {
      icon: Package,
      title: 'Lingot-hylki',
      body: 'Lífbrjótanleg hylki með fræjum og innbyggðri næringu sem dugar í u.þ.b. 12 vikur — skiptu þá um Lingot.',
    },
  ];
  return (
    <StepWrap>
      <StepHeader
        eyebrow="Véritable"
        title="Nánast viðhaldsfrítt"
        why="Af því að þú valdir Véritable SMART sleppum við ljósa-uppsetningu og sýnum tækisfróðleik."
        hint="Véritable SMART sér um ljós og vökvun sjálft — þú þarft bara að fylla á tank og skipta um Lingot."
      />
      <Card className="space-y-4">
        {facts.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl p-2.5 bg-moss-800/60 text-moss-300">
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="heading text-base font-semibold text-cream-50">{f.title}</div>
                <p className="text-sm text-cream-300/70 leading-snug mt-0.5">{f.body}</p>
              </div>
            </div>
          );
        })}
      </Card>
      <p className="text-[11.5px] text-cream-300/70 leading-snug">
        Rós minnir þig á áfyllingu, tankhreinsun og kveikjaskoðun þegar þar að kemur.
      </p>
    </StepWrap>
  );
}

const LIGHT_PRESETS = [
  'Dagsbirta + plöntuljós',
  'Lumii SwitchBlade 150W',
  'Mars Hydro TSW2000 300W',
  'Lumatek Attis Pro 200W',
  'Annað / engin LED',
];

function LightStep({
  state,
  set,
}: {
  state: WizardState;
  set: (patch: Partial<WizardState>) => void;
}) {
  return (
    <StepWrap>
      <StepHeader
        eyebrow="Ljós"
        title="Hvaða lampa ertu með?"
        why="Af því að þú valdir innirækt notum við lampann til að gefa ljósráð eftir birtu mánaðarins."
        hint="Valkvætt — þú getur bætt við síðar."
      />
      <Card className="space-y-5">
        <Field label="Lampi" icon={Lightbulb}>
          <input
            value={state.fixture}
            onChange={(e) => set({ fixture: e.target.value })}
            placeholder="t.d. Lumii SwitchBlade 150W"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LIGHT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => set({ fixture: preset })}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm text-left transition-all',
                state.fixture === preset
                  ? 'bg-moss-800/60 border-moss-400 text-cream-50'
                  : 'bg-moss-900/30 border-moss-800/40 text-cream-300 hover:border-moss-600',
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </Card>
    </StepWrap>
  );
}
