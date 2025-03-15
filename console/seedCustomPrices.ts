import { CustomPrices } from "../server/models/CustomPrices";

export default {
  name: "seed:customPrices",
  description: "Seeds custom prices",
  longRunning: false,
  run: async () => {
    const itemPrices = [
      { type_id: 12478, price: 0.01 }, // Khumaak
      { type_id: 34559, price: 0.01 }, // Conflux Element
      { type_id: 44265, price: 0.01 }, // Victory Firework
      { type_id: 55511, price: 30000000 }, // Obnoxiously market manipulated item
      { type_id: 34558, price: 0.01 },
      { type_id: 34556, price: 0.01 },
      { type_id: 34560, price: 0.01 },
      { type_id: 36902, price: 0.01 },
      { type_id: 34557, price: 0.01 },
      { type_id: 44264, price: 0.01 },
      { type_id: 45645, price: 35000000000 }, // Loggerhead
      { type_id: 42243, price: 70000000000 }, // Chemosh
      { type_id: 2834, price: 80000000000 }, // Utu
      { type_id: 3516, price: 80000000000 }, // Malice
      { type_id: 11375, price: 80000000000 }, // Freki
      { type_id: 3514, price: 100000000000, date: new Date("2023-12-01") }, // Revenant (conditional)
      { type_id: 3514, price: 250000000000 }, // Revenant (default)
      { type_id: 3518, price: 100000000000 }, // Vangel
      { type_id: 32788, price: 100000000000 }, // Cambion
      { type_id: 32790, price: 100000000000 }, // Etana
      { type_id: 32209, price: 100000000000 }, // Mimir
      { type_id: 11942, price: 100000000000 }, // Silver Magnate
      { type_id: 33673, price: 100000000000 }, // Whiptail
      { type_id: 35779, price: 120000000000 }, // Imp
      { type_id: 42125, price: 120000000000 }, // Vendetta
      { type_id: 42246, price: 120000000000 }, // Caedes
      { type_id: 74141, price: 120000000000 }, // Geri
      { type_id: 2836, price: 150000000000 }, // Adrestia
      { type_id: 33675, price: 150000000000 }, // Chameleon
      { type_id: 35781, price: 150000000000 }, // Fiend
      { type_id: 45530, price: 150000000000 }, // Virtuoso
      { type_id: 48636, price: 150000000000 }, // Hydra
      { type_id: 60765, price: 150000000000 }, // Raiju
      { type_id: 74316, price: 150000000000 }, // Bestla
      { type_id: 78414, price: 150000000000 }, // Shapash
      { type_id: 33397, price: 200000000000 }, // Chremoas
      { type_id: 42245, price: 200000000000 }, // Rabisu
      { type_id: 45649, price: 200000000000 }, // Komodo
      { type_id: 45531, price: 230000000000 }, // Victor
      { type_id: 48635, price: 230000000000 }, // Tiamat
      { type_id: 60764, price: 230000000000 }, // Laelaps
      { type_id: 77726, price: 230000000000 }, // Cybele
      { type_id: 47512, price: 60000000000 }, // 'Moreau' Fortizar
      { type_id: 45647, price: 60000000000 }, // Caiman
      { type_id: 9860, price: 1000000000000 }, // Polaris
      { type_id: 11019, price: 1000000000000 }, // Cockroach
      { type_id: 42126, price: 650000000000 }, // Vanquisher
      { type_id: 42241, price: 350000000000, date: new Date("2019-07-01") }, // Molok (conditional)
      { type_id: 42241, price: 650000000000 }, // Molok (default)
      { type_id: 11940, price: 500000000000, date: new Date("2020-01-25") }, // Gold Magnate (conditional)
      { type_id: 11940, price: 3400000000000 }, // Gold Magnate (default)
      { type_id: 635, price: 500000000000 }, // Opux Luxury Yacht
      { type_id: 11011, price: 500000000000 }, // Guardian-Vexor
      { type_id: 25560, price: 500000000000 }, // Opux Dragoon Yacht
      { type_id: 33395, price: 500000000000 }, // Moracha
      { type_id: 13202, price: 750000000000 }, // Megathron Federate Issue
      { type_id: 11936, price: 750000000000 }, // Apocalypse Imperial Issue
      { type_id: 11938, price: 750000000000 }, // Armageddon Imperial Issue
      { type_id: 26842, price: 750000000000 }, // Tempest Tribal Issue
      { type_id: 26840, price: 2500000000000 }, // Raven State Issue
      { type_id: 47514, price: 60000000000 }, // 'Horizon' Fortizar
    ];

    await CustomPrices.deleteMany({});
    await CustomPrices.insertMany(itemPrices);

    return { result: "success" };
  },
};
