/**
 * Ready-made scenes: blocking, space and a camera move in one tap.
 * Written in the same JSON the AI answers with (see ai.ts SYSTEM); toProject() turns them into a project.
 */
export interface ReadyScene { id: string; gr: string; note: string; scene: Record<string, unknown> }

const wallBack = (z: number) => [{ kind: 'wall', x: -2, z, rot: 0 }, { kind: 'wall', x: 2, z, rot: 0 }]

export const SCENES: ReadyScene[] = [
  {
    id: 'table', gr: 'Διάλογος στο τραπέζι', note: 'δύο καθιστοί, αργό τόξο',
    scene: {
      duration: 10, handheld: 0,
      figures: [
        { label: 'A', x: -0.95, z: 0, facing: 90, pose: 'sit', height: 1.8 },
        { label: 'B', x: 0.95, z: 0, facing: -90, pose: 'sit', height: 1.68 },
      ],
      props: [{ kind: 'table', x: 0, z: 0, rot: 90 }, ...wallBack(-3.5)],
      camera: [
        { t: 0, around: [0, 0], azimuth: 0, distance: 4.2, height: 1.3, look: [0, 1, 0], lens: 35, ease: 'in' },
        { t: 5, around: [0, 0], azimuth: -35, distance: 3.2, height: 1.25, look: [0.3, 1.05, 0], lens: 35, ease: 'linear' },
        { t: 10, around: 'A', azimuth: 145, distance: 1.5, height: 1.42, look: 'B', lens: 50, ease: 'out' },
      ],
    },
  },
  {
    id: 'walktalk', gr: 'Walk and talk', note: 'δύο περπατάνε, η κάμερα μπροστά τους',
    scene: {
      duration: 10, handheld: 25,
      figures: [
        { label: 'A', x: -0.45, z: -6, facing: 0, pose: 'walk', height: 1.8, path: { x: -0.45, z: 6, t0: 0, t1: 10 } },
        { label: 'B', x: 0.45, z: -6.2, facing: 0, pose: 'walk', height: 1.7, path: { x: 0.45, z: 5.8, t0: 0, t1: 10 } },
      ],
      props: [{ kind: 'wall', x: -2.4, z: -2, rot: 90 }, { kind: 'wall', x: -2.4, z: 2.5, rot: 90 }, { kind: 'tree', x: 2.6, z: -3, rot: 0 }, { kind: 'tree', x: 2.9, z: 3, rot: 0 }],
      camera: [
        { t: 0, around: 'A', azimuth: -8, size: 'medium_wide', height: 1.5, look: 'A', lens: 35, ease: 'linear' },
        { t: 10, around: 'A', azimuth: -8, size: 'medium', height: 1.5, look: 'A', lens: 35, ease: 'linear' },
      ],
    },
  },
  {
    id: 'enter', gr: 'Είσοδος από πόρτα', note: 'μπαίνει και έρχεται προς εμάς',
    scene: {
      duration: 8, handheld: 0,
      figures: [{ label: 'A', x: 0, z: -5.6, facing: 0, pose: 'walk', height: 1.8, path: { x: 0, z: -0.5, t0: 1, t1: 5.5 } }],
      props: [{ kind: 'door', x: 0, z: -5, rot: 0 }, { kind: 'wall', x: -2.6, z: -5, rot: 0 }, { kind: 'wall', x: 2.6, z: -5, rot: 0 }, { kind: 'sofa', x: -2.4, z: -1.5, rot: 90 }, { kind: 'table', x: 2.3, z: -2.4, rot: 0 }],
      camera: [
        { t: 0, around: [0, -0.5], azimuth: 12, distance: 5, height: 1.4, look: [0, 1.3, -5], lens: 24, ease: 'inout' },
        { t: 5.5, around: [0, -0.5], azimuth: 12, distance: 3.2, height: 1.45, look: 'A', lens: 35, ease: 'out' },
        { t: 8, around: 'A', azimuth: 10, size: 'medium_close', height: 1.55, look: 'A', lens: 50, ease: 'linear' },
      ],
    },
  },
  {
    id: 'chase', gr: 'Καταδίωξη', note: 'δύο τρέχουν, tracking στο πλάι',
    scene: {
      duration: 6, handheld: 65,
      figures: [
        { label: 'A', x: -9, z: 0, facing: 90, pose: 'run', height: 1.78, path: { x: 9, z: 0, t0: 0, t1: 6 } },
        { label: 'B', x: -12.5, z: 0.6, facing: 90, pose: 'run', height: 1.84, path: { x: 6.5, z: 0.4, t0: 0, t1: 6 } },
      ],
      props: [{ kind: 'car', x: -3, z: -3, rot: 90 }, { kind: 'box', x: 2, z: -1.6, rot: 20 }, { kind: 'column', x: 6, z: -2.2, rot: 0 }, { kind: 'column', x: -7, z: -2.2, rot: 0 }, { kind: 'wall', x: 0, z: -5, rot: 0 }, { kind: 'wall', x: 4, z: -5, rot: 0 }, { kind: 'wall', x: -4, z: -5, rot: 0 }],
      camera: [
        { t: 0, around: 'A', azimuth: -70, size: 'full', height: 1.2, look: 'A', lens: 24, ease: 'linear' },
        { t: 6, around: 'A', azimuth: -110, size: 'full', height: 1.2, look: 'A', lens: 24, ease: 'linear' },
      ],
    },
  },
  {
    id: 'standoff', gr: 'Αντιπαράθεση', note: 'πρόσωπο με πρόσωπο, από τον ώμο σε προφίλ',
    scene: {
      duration: 10, handheld: 10,
      figures: [
        { label: 'A', x: -1.6, z: 0, facing: 90, pose: 'stand', height: 1.82 },
        { label: 'B', x: 1.6, z: 0, facing: -90, pose: 'stand', height: 1.78 },
      ],
      props: [{ kind: 'column', x: -3.5, z: -3, rot: 0 }, { kind: 'column', x: 3.5, z: -3, rot: 0 }, ...wallBack(-5)],
      camera: [
        { t: 0, around: 'A', azimuth: 150, distance: 1.4, height: 1.65, look: 'B', lens: 50, ease: 'in' },
        { t: 5, around: [0, 0], azimuth: -60, distance: 3.6, height: 1.5, look: [0, 1.4, 0], lens: 50, ease: 'out' },
        { t: 10, around: [0, 0], azimuth: 0, distance: 5.5, height: 1.2, look: [0, 1.3, 0], lens: 35, ease: 'linear' },
      ],
    },
  },
  {
    id: 'singer', gr: 'Τραγουδιστής και μπάντα', note: 'music video, χαμηλό orbit',
    scene: {
      duration: 12, handheld: 15,
      figures: [
        { label: 'A', x: 0, z: 0, facing: 0, pose: 'stand', height: 1.8 },
        { label: 'B', x: -2.2, z: -2, facing: 15, pose: 'stand', height: 1.78 },
        { label: 'C', x: 2.2, z: -2, facing: -15, pose: 'stand', height: 1.75 },
        { label: 'D', x: 0, z: -3.2, facing: 0, pose: 'sit', height: 1.8 },
      ],
      props: [{ kind: 'mic', x: 0, z: 0.35, rot: 0 }, { kind: 'box', x: -3.4, z: -2.6, rot: 0 }, { kind: 'box', x: 3.4, z: -2.6, rot: 0 }, ...wallBack(-5.5)],
      camera: [
        { t: 0, around: 'A', azimuth: -80, size: 'full', height: 0.6, look: 'A', lens: 24, ease: 'in' },
        { t: 3, around: 'A', azimuth: -40, size: 'medium_wide', height: 0.7, look: 'A', lens: 24, ease: 'linear' },
        { t: 6, around: 'A', azimuth: 0, size: 'medium', height: 0.9, look: 'A', lens: 24, ease: 'linear' },
        { t: 9, around: 'A', azimuth: 40, size: 'medium_wide', height: 0.7, look: 'A', lens: 24, ease: 'out' },
        { t: 12, around: 'A', azimuth: 80, size: 'full', height: 0.6, look: 'A', lens: 24, ease: 'linear' },
      ],
    },
  },
  {
    id: 'solo', gr: 'Performance σόλο', note: 'orbit 360 που ανεβαίνει',
    scene: {
      duration: 12, handheld: 0,
      figures: [{ label: 'A', x: 0, z: 0, facing: 0, pose: 'stand', height: 1.78 }],
      props: [{ kind: 'column', x: -4, z: -4, rot: 0 }, { kind: 'column', x: 4, z: -4, rot: 0 }, { kind: 'column', x: -4, z: 4, rot: 0 }, { kind: 'column', x: 4, z: 4, rot: 0 }],
      camera: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
        t: i * 1.5, around: 'A', azimuth: i * 45, size: i < 5 ? 'full' : 'medium_wide', height: 0.6 + i * 0.3, look: 'A', lens: 35, ease: i === 0 ? 'in' : i === 7 ? 'out' : 'linear',
      })),
    },
  },
  {
    id: 'meet', gr: 'Συνάντηση', note: 'ο ένας πλησιάζει, crane down σε δίπλανο',
    scene: {
      duration: 10, handheld: 0,
      figures: [
        { label: 'A', x: -6, z: 0, facing: 90, pose: 'walk', height: 1.8, path: { x: -0.9, z: 0, t0: 0.5, t1: 5.5 } },
        { label: 'B', x: 0.6, z: 0, facing: -90, pose: 'stand', height: 1.7 },
      ],
      props: [{ kind: 'tree', x: 2.5, z: -3, rot: 0 }, { kind: 'tree', x: -4, z: -3.5, rot: 0 }, { kind: 'car', x: 4.5, z: -1, rot: 20 }],
      camera: [
        { t: 0, around: [0, 0], azimuth: 0, distance: 9, height: 5, look: [-1.5, 1, 0], lens: 24, ease: 'inout' },
        { t: 6, around: [0, 0], azimuth: 0, distance: 4.5, height: 1.5, look: [-0.1, 1.3, 0], lens: 35, ease: 'out' },
        { t: 10, around: [0, 0], azimuth: 0, distance: 3.3, height: 1.45, look: [-0.1, 1.35, 0], lens: 35, ease: 'linear' },
      ],
    },
  },
  {
    id: 'car', gr: 'Δίπλα στο αυτοκίνητο', note: 'κοντινό που ανοίγει και αποκαλύπτει',
    scene: {
      duration: 8, handheld: 0,
      figures: [{ label: 'A', x: 0, z: 1.3, facing: 20, pose: 'stand', height: 1.8 }],
      props: [{ kind: 'car', x: 0.2, z: 0, rot: 90 }, { kind: 'tree', x: -4, z: -3, rot: 0 }, { kind: 'wall', x: 0, z: -4, rot: 0 }, { kind: 'wall', x: 4, z: -4, rot: 0 }],
      camera: [
        { t: 0, around: 'A', azimuth: 5, size: 'close', height: 1.6, look: [0, 1.62, 1.3], lens: 50, ease: 'in' },
        { t: 4, around: 'A', azimuth: 15, size: 'medium_wide', height: 1.5, look: 'A', lens: 50, ease: 'out' },
        { t: 8, around: 'A', azimuth: 25, size: 'wide', height: 1.9, look: 'A', lens: 35, ease: 'linear' },
      ],
    },
  },
  {
    id: 'alone', gr: 'Μόνος στον χώρο', note: 'καθιστός, overhead που κατεβαίνει',
    scene: {
      duration: 10, handheld: 0,
      figures: [{ label: 'A', x: 0, z: 0, facing: 0, pose: 'sit', height: 1.78 }],
      props: [{ kind: 'bed', x: 2.6, z: -1.8, rot: 0 }, { kind: 'chair', x: -2, z: -1.5, rot: 40 }, ...wallBack(-3.5), { kind: 'wall', x: 4, z: -1.5, rot: 90 }],
      camera: [
        { t: 0, around: [0, 0.05], azimuth: 0, distance: 0.05, height: 8, look: [0, 0, 0], lens: 24, ease: 'inout' },
        { t: 10, around: [0, 0.05], azimuth: 0, distance: 0.05, height: 3.6, look: [0, 0, 0], lens: 24, ease: 'linear' },
      ],
    },
  },
]
