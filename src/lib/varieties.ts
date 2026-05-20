import type { ChiliVariety } from '@/components/Chili';
import type { VarietyPreset } from './db';

export interface VarietyWithChili extends VarietyPreset {
  chili: ChiliVariety;
}

export const BUILT_IN_VARIETIES: VarietyWithChili[] = [
  {
    id: 'pepper-habanero-helios',
    commonName: 'Habanero Helios',
    scientificName: 'Capsicum chinense',
    category: 'pepper',
    chili: 'habanero_helios',
    shu: 200000,
    flavor: 'Ávaxtaríkt, sítrus, klassísk habanero',
    origin: 'Norðlægt hybrid — sérvalið fyrir kaldari loftslag',
    daysToGerminate: [10, 21],
    daysToHarvest: [90, 110],
    notes:
      'Snemmari og afkastameiri en venjuleg Habanero. Tilvalin í 19°C umhverfi með LED — sérstaklega ræktuð fyrir Norður-Evrópu.',
    isBuiltIn: true,
  },
  {
    id: 'pepper-carolina-reaper',
    commonName: 'Carolina Reaper',
    scientificName: 'Capsicum chinense',
    category: 'pepper',
    chili: 'reaper',
    shu: 1640000,
    flavor: 'Ávaxtaríkt, kirsuber, mikill hiti',
    origin: 'Ed Currie, PuckerButt Pepper Co., S-Karólína',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes:
      'Þarfnast 27–32°C jarðvegshita við spírun. Frjóvga með hendi innandyra. Toppa við 15 cm hæð fyrir meiri uppskeru.',
    isBuiltIn: true,
  },
  {
    id: 'pepper-7-pot-primo',
    commonName: '7 Pot Primo',
    scientificName: 'Capsicum chinense',
    category: 'pepper',
    chili: 'primo',
    shu: 1470000,
    flavor: 'Sætt, blómaríkt, sítrus undirtónn',
    origin: 'Troy Primeaux, Louisiana — kross 7 Pot × Naga Morich',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes:
      'Þekkt fyrir „scorpion tail" — mjög falleg planta og ávextir. Sætasta 7 Pot afbrigðið.',
    isBuiltIn: true,
  },
  {
    id: 'pepper-bhut-jolokia-chocolate',
    commonName: 'Bhut Jolokia Chocolate',
    scientificName: 'Capsicum chinense',
    category: 'pepper',
    chili: 'ghost_chocolate',
    shu: 900000,
    flavor: 'Súkkulaði, rúsínu, dökk sæta',
    origin: 'Norðaustur-Indland — afbrigði af Ghost pepper',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes:
      'Aðeins mildari en rauð Bhut. Passar einstaklega vel í sósur með muscovado eða molasses tónum.',
    isBuiltIn: true,
  },
  {
    id: 'pepper-habanero-orange',
    commonName: 'Habanero Orange',
    scientificName: 'Capsicum chinense',
    category: 'pepper',
    chili: 'habanero_orange',
    shu: 200000,
    flavor: 'Klassík, ávaxtaríkt, sítrus',
    origin: 'Yucatán — víða ræktuð',
    daysToGerminate: [10, 21],
    daysToHarvest: [90, 110],
    notes: 'Áreiðanleg uppskera, gott baseline afbrigði.',
    isBuiltIn: true,
  },
];

export function chiliForVarietyId(id?: string): ChiliVariety {
  if (!id) return 'jalapeno';
  const v = BUILT_IN_VARIETIES.find((x) => x.id === id);
  return v?.chili ?? 'jalapeno';
}

export function chiliForVarietyName(name?: string): ChiliVariety {
  if (!name) return 'jalapeno';
  const v = BUILT_IN_VARIETIES.find((x) => x.commonName === name);
  return v?.chili ?? 'jalapeno';
}
