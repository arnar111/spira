import type { LucideIcon } from 'lucide-react';
import { Home, Tent, Droplets, Hammer } from 'lucide-react';

export type LocationKey = 'window' | 'tent' | 'shower' | 'diy';

export interface LocationCategory {
  key: LocationKey;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
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
];

export function getLocation(key: LocationKey): LocationCategory {
  return LOCATIONS.find((l) => l.key === key) ?? LOCATIONS[2];
}
