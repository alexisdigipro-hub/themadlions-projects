/**
 * What the tool has learned from Alex. Both lists go into every "Σκηνή με AI" request (ai.ts).
 * RULES: his standing preferences, one sentence each, in English.
 * EXAMPLES: a description as he wrote it and the scene he approved, in the same JSON the model answers with.
 * Add to them whenever he corrects a result or sends a "ΣΩΣΤΟ ΠΛΑΝΟ" block from the tool.
 */
export const RULES: string[] = []

export const EXAMPLES: { text: string; scene: Record<string, unknown> }[] = [
  {
    text: 'Ο Νίκος μπαίνει από την πόρτα και περπατάει ως το τραπέζι όπου κάθεται η Μαρία. Η κάμερα τον ακολουθεί από πίσω και καταλήγει σε over the shoulder πάνω της.',
    scene: {
      duration: 8,
      handheld: 20,
      figures: [
        { label: 'A', name: 'Νίκος', x: 0, z: -4.5, facing: 0, pose: 'walk', height: 1.82, path: { x: 0.3, z: 0.6, t0: 0.5, t1: 5 } },
        { label: 'B', name: 'Μαρία', x: 0.9, z: 1.9, facing: 200, pose: 'sit', height: 1.68, path: null },
      ],
      props: [
        { kind: 'door', x: 0, z: -5, rot: 0 },
        { kind: 'wall', x: -2.6, z: -5, rot: 0 },
        { kind: 'wall', x: 2.6, z: -5, rot: 0 },
        { kind: 'table', x: 0.9, z: 1.3, rot: 0 },
      ],
      camera: [
        { t: 0, around: 'A', azimuth: 180, size: 'medium_wide', height: 1.6, look: 'A', lens: 35, ease: 'in' },
        { t: 5, around: 'A', azimuth: 180, size: 'medium_wide', height: 1.6, look: 'A', lens: 35, ease: 'inout' },
        { t: 8, around: 'A', azimuth: 150, distance: 1.3, height: 1.6, look: 'B', lens: 50, ease: 'linear' },
      ],
      notes: 'Έβαλα τον Νίκο να μπαίνει από την πόρτα και τη Μαρία καθιστή στο τραπέζι. Η κάμερα τον ακολουθεί από πίσω και κλείνει σε over the shoulder.',
    },
  },
]
