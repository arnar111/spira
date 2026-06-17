import type { LucideIcon } from 'lucide-react';
import { Home, Tent, Droplets, Hammer, Trees, Sprout } from 'lucide-react';
import type { GrowEnvironment } from './db';

export type LocationKey = 'window' | 'tent' | 'shower' | 'diy' | 'garden' | 'veritable';

export interface LocationCategory {
  key: LocationKey;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  /** Indoor (LED-driven) or outdoor (season/frost-driven). */
  environment: GrowEnvironment;
  /** Plant size that fits comfortably here */
  maxHeightCm: number;
  /** Typical natural light strength 0-1 */
  lightScore: number;
  /** Controlled humidity? */
  humidityControl: boolean;
  /** Sensible defaults for the SetupWizard */
  defaults: {
    growName: string;
    spaceWidthCm: number;
    spaceDepthCm: number;
    spaceHeightCm: number;
    targetTempC: number;
    fixture: string;
  };
}

export const LOCATIONS: LocationCategory[] = [
  {
    key: 'window',
    label: 'Gluggi',
    short: 'Sólríkt sæti',
    description:
      'Sólríkur gluggi, takmarkað pláss. Hentar fyrir minni og fljótvaxnar piprategundir.',
    icon: Home,
    environment: 'indoor',
    maxHeightCm: 70,
    lightScore: 0.4,
    humidityControl: false,
    defaults: {
      growName: 'Glugga-piparar',
      spaceWidthCm: 40,
      spaceDepthCm: 25,
      spaceHeightCm: 80,
      targetTempC: 21,
      fixture: 'Dagsbirta + plöntuljós',
    },
  },
  {
    key: 'tent',
    label: 'Ræktunartjald',
    short: 'Full stjórn',
    description:
      'Ræktunartjald með LED og loftrás. Hentar fyrir öll afbrigði — superhots og fyrir hærri uppskeru.',
    icon: Tent,
    environment: 'indoor',
    maxHeightCm: 200,
    lightScore: 1,
    humidityControl: true,
    defaults: {
      growName: 'Tjald-piparar',
      spaceWidthCm: 120,
      spaceDepthCm: 120,
      spaceHeightCm: 200,
      targetTempC: 26,
      fixture: 'Mars Hydro TSW2000 300W',
    },
  },
  {
    key: 'shower',
    label: 'Sturturými',
    short: 'Heit & raka',
    description:
      'Bjart sturtuherbergi með háu lofti og raka. Frábært fyrir Habanero og Bhut Jolokia.',
    icon: Droplets,
    environment: 'indoor',
    maxHeightCm: 180,
    lightScore: 0.7,
    humidityControl: true,
    defaults: {
      growName: 'Sturtu-piparar',
      spaceWidthCm: 80,
      spaceDepthCm: 80,
      spaceHeightCm: 190,
      targetTempC: 24,
      fixture: 'Lumii SwitchBlade 150W',
    },
  },
  {
    key: 'diy',
    label: 'Heimatilbúið',
    short: 'Sérsmíðað',
    description:
      'Sérsmíðuð aðstaða — segðu Spíru rýmið og þú færð pipra sem hentar.',
    icon: Hammer,
    environment: 'indoor',
    maxHeightCm: 150,
    lightScore: 0.6,
    humidityControl: false,
    defaults: {
      growName: 'Heima-piparar',
      spaceWidthCm: 60,
      spaceDepthCm: 60,
      spaceHeightCm: 150,
      targetTempC: 22,
      fixture: 'Lumatek Attis Pro 200W',
    },
  },
  {
    key: 'garden',
    label: 'Garður',
    short: 'Útiræktun',
    description:
      'Útibeð eða matjurtagarður undir berum himni. Náttúrubirta ræður — ræktun stýrist af árstíð og frosti. Hentar kartöflum og útijarðarberjum.',
    icon: Trees,
    environment: 'outdoor',
    maxHeightCm: 120,
    lightScore: 1,
    humidityControl: false,
    defaults: {
      growName: 'Garður',
      spaceWidthCm: 200,
      spaceDepthCm: 200,
      spaceHeightCm: 0,
      targetTempC: 12,
      fixture: 'Náttúrubirta',
    },
  },
  {
    key: 'veritable',
    label: 'Véritable SMART',
    short: 'Vatnsræktun',
    description:
      'Borðvatnsræktun með Lingot-hylkjum, innbyggðu LED-ljósi og sjálfvökvandi kveikjum. Fullkomið fyrir kryddjurtir, salat og smáaldin allan íslenska veturinn — nánast viðhaldsfrítt.',
    icon: Sprout,
    environment: 'indoor',
    maxHeightCm: 30,
    lightScore: 1,
    humidityControl: false,
    defaults: {
      growName: 'Véritable garðurinn',
      spaceWidthCm: 33,
      spaceDepthCm: 19,
      spaceHeightCm: 39,
      targetTempC: 21,
      fixture: 'Véritable AdaptLight LED 10,5W — 16 klst sjálfvirkt',
    },
  },
];

export function getLocation(key: LocationKey): LocationCategory {
  // Varagildi fyrir óþekkta lykla (t.d. úr eldra geymslusniði): 'window' — minnsti
  // sameiginlegi nefnari (inni, ljósasnautt). Flett upp eftir lykli, ekki vísi,
  // svo röðun LOCATIONS megi breytast án þess að varagildið breytist hljóðlega.
  return (
    LOCATIONS.find((l) => l.key === key) ??
    LOCATIONS.find((l) => l.key === 'window')!
  );
}
