// Greek and English; the app follows the system language unless Settings picks one.
import type { PrintLabels } from '../shared/api'
import { get as settings } from './settings'

export const SIZES = ['ECU', 'CU', 'MCU', 'MS', 'MWS', 'WS', 'EWS', 'INS', 'OTS', 'POV', '2S']
export const ANGLES = ['eye', 'high', 'low', 'dutch', 'overhead', 'ground']
export const MOVES = ['static', 'pan', 'tilt', 'push', 'pull', 'dolly', 'track', 'handheld', 'steadicam', 'gimbal', 'crane', 'drone', 'zoom']
export const ASPECTS = ['16:9', '2.39:1', '1.85:1', '4:3', '1:1', '4:5', '9:16']

const el = {
  shotlists: 'Shot lists', newList: 'Νέο shot list', untitled: 'Χωρίς τίτλο', open: 'Άνοιγμα .roarlist',
  title: 'Τίτλος', client: 'Πελάτης', director: 'Σκηνοθέτης', dop: 'Δ/ντής φωτογραφίας', date: 'Ημέρα γυρίσματος', aspect: 'Κάδρο',
  notes: 'Σημειώσεις', projectNotes: 'Γενικές σημειώσεις για το γύρισμα',
  scene: 'Σκηνή', shot: 'Πλάνο', shots: 'Πλάνα', frame: 'Κάδρο', size: 'Μέγεθος', angle: 'Γωνία', move: 'Κίνηση', lens: 'Φακός',
  description: 'Περιγραφή', cast: 'Ηθοποιοί', duration: 'Διάρκεια', done: 'Γυρίστηκε', total: 'Σύνολο',
  heading: 'π.χ. ΕΣΩΤ. ΚΟΥΖΙΝΑ - ΝΥΧΤΑ', descPh: 'Τι βλέπουμε', addShot: 'Πλάνο', addScene: 'Σκηνή',
  list: 'Λίστα', board: 'Storyboard', export: 'Εξαγωγή', pdfList: 'PDF λίστα', pdfBoard: 'PDF storyboard', html: 'Ιστοσελίδα (.html)',
  file: 'Αρχείο .roarlist', fileHint: 'Για να το ανοίξει άλλος στο RoarList',
  duplicate: 'Αντίγραφο', remove: 'Διαγραφή', removeQ: 'Να πάει στον κάδο το shot list;', removeQWeb: 'Να διαγραφεί οριστικά το shot list, με τα καρέ του, για όλη την ομάδα;',
  hubSignIn: 'Συνδέσου στο hub για να δεις τα shot lists.', hubNoAccess: 'Δεν έχεις πρόσβαση στα shot lists', hubNoAccessSub: 'Τα ανοίγει όποιος έχει το δικαίωμα Shot list στο Team.', viewOnly: 'Μόνο προβολή', hubProject: 'Project', noProject: 'Χωρίς project', hubTheme: 'Ακολουθεί το θέμα του hub', hubThemeNote: 'Τα χρώματα, το γυαλί, το φόντο και η γραμματοσειρά έρχονται από το Settings > Display του hub.',
  privacy: 'Πολιτική απορρήτου', terms: 'Όροι χρήσης', agreeA: 'Με τη δημιουργία λογαριασμού αποδέχεσαι τους', agreeB: 'και την', deleteAccount: 'Για διαγραφή λογαριασμού: RoarMe > Settings > Privacy and Security > Delete My Account.', removeShotQ: 'Να διαγραφεί το πλάνο;', removeSceneQ: 'Να διαγραφεί η σκηνή με όλα τα πλάνα της;',
  copyOf: 'Αντίγραφο του', addImage: 'Βάλε εικόνα', dropImage: 'Σύρε, επικόλλησε ή διάλεξε εικόνα', removeImage: 'Αφαίρεση εικόνας', replaceImage: 'Αλλαγή εικόνας',
  moveUp: 'Πάνω', moveDown: 'Κάτω', drag: 'Σύρε για αλλαγή σειράς', saved: 'Αποθηκεύτηκε', exported: 'Έτοιμο', empty: 'Φτιάξε το πρώτο σου shot list',
  emptySub: 'Σκηνές, πλάνα, κάδρα και storyboard, και ένα PDF για το συνεργείο.', start: 'Ξεκίνα', updateReady: 'Νέα έκδοση έτοιμη', restart: 'Επανεκκίνηση',
  imgError: 'Αυτή η εικόνα δεν γίνεται δεκτή (PNG, JPG, WebP, GIF).', secs: 'δευτ.', undo: 'Αναίρεση', deleted: 'Διαγράφηκε',
  general: 'Γενικά', keys: 'Συντομεύσεις', theme: 'Θέμα', themeOwn: 'Το χρώμα του θέματος', text: 'Κείμενο', font: 'Γραμματοσειρά',
  layout: 'Διάταξη', spacing: 'Αποστάσεις', tight: 'Σφιχτά', relaxed: 'Άνετα', effects: 'Εφέ', glassLook: 'Γυάλινα κουμπιά',
  glassHint: 'Τα κύρια κουμπιά σαν χρωματιστό γυαλί, όπως στο RoarMe.', motion: 'Ομαλά animations', focusRings: 'Έντονο περίγραμμα εστίασης',
  focusHint: 'Δείχνει καθαρά πού βρίσκεσαι όταν κινείσαι με το πληκτρολόγιο.', battery: 'Μπαταρία', lite: 'Εξοικονόμηση ενέργειας',
  liteHint: 'Χωρίς θόλωμα και κίνηση, για παλιούς υπολογιστές και λάπτοπ στην μπαταρία.', resetAll: 'Επαναφορά όλων των ρυθμίσεων',
  resetHint: 'Η γλώσσα μένει όπως είναι.', reset: 'Επαναφορά', resetQ: 'Να γυρίσουν όλες οι ρυθμίσεις στις αρχικές;',
  confirmDeleteHint: 'Χωρίς αυτό, η διαγραφή αναιρείται από το κάτω μήνυμα ή με ⌘Z.', interface: 'Γλώσσα εφαρμογής',
  langNote: 'Η εφαρμογή ξαναφορτώνει για να αλλάξει γλώσσα.', newLists: 'Για κάθε νέα λίστα', printing: 'Εκτύπωση',
  previewLine: 'Ο Νίκος περπατά στην άκρη του νερού', desktopAccount: 'Ο λογαριασμός RoarMe έρχεται και στην εφαρμογή υπολογιστή.',
  heroAccount: 'Ο λογαριασμός σου στο RoarMe, ο ίδιος παντού.', heroGeneral: 'Πώς συμπεριφέρεται το RoarList.',
  heroAppearance: 'Θέμα, χρώματα, κείμενο και κίνηση, όπως στο RoarMe.', heroLanguage: 'Ελληνικά ή αγγλικά.',
  heroLists: 'Τι παίρνει μια νέα λίστα και ποιες στήλες βλέπεις.', heroPdf: 'Πώς τυπώνεται η λίστα και το storyboard.', heroKeys: 'Όλα από το πληκτρολόγιο.',
  k_search: 'Αναζήτηση στα shot lists', k_new: 'Νέο shot list', k_shot: 'Νέο πλάνο κάτω από αυτό', k_scene: 'Νέα σκηνή', k_pdf: 'PDF λίστα',
  k_board: 'PDF storyboard', k_undo: 'Αναίρεση διαγραφής ή μετακίνησης', k_settings: 'Ρυθμίσεις', k_keys: 'Αυτή η σελίδα', k_esc: 'Κλείνει μενού και παράθυρα',
  k_paste: '⌘ V σε πλάνο', k_pasteWhat: 'Η εικόνα του προχείρου γίνεται κάδρο', k_right: 'Δεξί κλικ σε λίστα', k_rightWhat: 'Άνοιγμα, αντίγραφο, εξαγωγή, διαγραφή',
  demoTitle: 'Παράδειγμα', demoCta: 'Φτιάξε το δικό σου shot list με τον λογαριασμό RoarMe →',
  searchPh: 'Αναζήτηση', openList: 'Άνοιγμα', rename: 'Μετονομασία', noMatch: 'Τίποτα δεν ταιριάζει',

  settings: 'Ρυθμίσεις', appearance: 'Εμφάνιση', mode: 'Μέρα και νύχτα', modeSystem: 'Όπως το σύστημα', modeDark: 'Σκούρο', modeLight: 'Ανοιχτό',
  accent: 'Χρώμα', radius: 'Γωνίες', textSize: 'Μέγεθος γραμμάτων', small: 'Μικρά', standard: 'Κανονικά', large: 'Μεγάλα',
  language: 'Γλώσσα', langSystem: 'Όπως το σύστημα', defaults: 'Νέα shot lists', defAspect: 'Κάδρο για νέα λίστα', defLens: 'Φακός για το πρώτο πλάνο',
  columns: 'Στήλες στη λίστα', columnsHint: 'Ό,τι κλείσεις κρύβεται από τη λίστα και το PDF. Τα δεδομένα μένουν.',
  pdf: 'PDF', paper: 'Χαρτί', pdfFrames: 'Κάδρα στο PDF λίστας', behaviour: 'Συμπεριφορά', confirmDelete: 'Ερώτηση πριν διαγραφεί πλάνο',
  account: 'Λογαριασμός', signedInAs: 'Συνδεδεμένος ως', signOut: 'Αποσύνδεση', changePassword: 'Αλλαγή κωδικού', newPassword: 'Νέος κωδικός',
  save: 'Αποθήκευση', passwordSaved: 'Ο κωδικός άλλαξε', close: 'Κλείσιμο', about: 'Σχετικά', version: 'Έκδοση',
  cloudNote: 'Τα shot lists σου μένουν στο cloud του λογαριασμού σου και τα βλέπεις από κάθε συσκευή.',
  localNote: 'Σε αυτή την εφαρμογή τα shot lists μένουν σε αυτόν τον υπολογιστή. Στο web (themadlions.com/roarlist) μένουν στο cloud του λογαριασμού σου.',
  signIn: 'Σύνδεση', signUp: 'Νέος λογαριασμός', fullName: 'Ονοματεπώνυμο', email: 'Email', password: 'Κωδικός', passwordNew: 'Κωδικός (τουλάχιστον 6 χαρακτήρες)',
  forgot: 'Ξέχασες τον κωδικό;', sameAccount: 'Ίδιος λογαριασμός με RoarMe, Roardino και RoarMail.', working: 'Μια στιγμή…',
  needEmail: 'Γράψε πρώτα το email σου.', resetSent: 'Σου στείλαμε email με link για νέο κωδικό.', fillBoth: 'Συμπλήρωσε email και κωδικό.',
  needName: 'Γράψε το όνομά σου.', confirmSent: 'Σχεδόν έτοιμο: σου στείλαμε email. Άνοιξε το link και μετά συνδέσου εδώ.',
  setNewPassword: 'Βάλε νέο κωδικό', imported: 'Μπήκαν στον λογαριασμό σου τα shot lists αυτής της συσκευής', offlineErr: 'Δεν αποθηκεύτηκε στο cloud. Έλεγξε τη σύνδεση.',
  err_login: 'Λάθος email ή κωδικός.', err_confirm: 'Δεν έχεις επιβεβαιώσει ακόμα το email σου. Άνοιξε το link που σου στείλαμε.',
  err_exists: 'Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδέσου ή ζήτα νέο κωδικό.', err_short: 'Ο κωδικός θέλει τουλάχιστον 6 χαρακτήρες.',
  err_rate: 'Πολλές προσπάθειες. Περίμενε λίγο και δοκίμασε ξανά.', err_email: 'Το email δεν φαίνεται σωστό.', err_other: 'Κάτι δεν πήγε καλά. Δοκίμασε ξανά.',
 durHint: 'λλ:δδ ή δευτερόλεπτα',
  values: {
    eye: 'Ύψος ματιών', high: 'Από ψηλά', low: 'Από χαμηλά', dutch: 'Dutch', overhead: 'Κάτοψη', ground: 'Από το έδαφος',
    static: 'Σταθερό', pan: 'Pan', tilt: 'Tilt', push: 'Push in', pull: 'Pull out', dolly: 'Dolly', track: 'Tracking', handheld: 'Στο χέρι',
    steadicam: 'Steadicam', gimbal: 'Gimbal', crane: 'Γερανός', drone: 'Drone', zoom: 'Zoom',
  } as Record<string, string>,
}
const en: typeof el = {
  shotlists: 'Shot lists', newList: 'New shot list', untitled: 'Untitled', open: 'Open .roarlist',
  title: 'Title', client: 'Client', director: 'Director', dop: 'DoP', date: 'Shoot day', aspect: 'Aspect',
  notes: 'Notes', projectNotes: 'General notes for the shoot',
  scene: 'Scene', shot: 'Shot', shots: 'Shots', frame: 'Frame', size: 'Size', angle: 'Angle', move: 'Movement', lens: 'Lens',
  description: 'Description', cast: 'Cast', duration: 'Duration', done: 'Shot', total: 'Total',
  heading: 'e.g. INT. KITCHEN - NIGHT', descPh: 'What we see', addShot: 'Shot', addScene: 'Scene',
  list: 'List', board: 'Storyboard', export: 'Export', pdfList: 'PDF list', pdfBoard: 'PDF storyboard', html: 'Web page (.html)',
  file: '.roarlist file', fileHint: 'For someone else to open in RoarList',
  duplicate: 'Duplicate', remove: 'Delete', removeQ: 'Move this shot list to the trash?', removeQWeb: 'Delete this shot list and its frames for the whole team, for good?',
  hubSignIn: 'Sign in to the hub to see the shot lists.', hubNoAccess: 'No access to the shot lists', hubNoAccessSub: 'Whoever has the Shot list permission on the Team page opens them.', viewOnly: 'View only', hubProject: 'Project', noProject: 'No project', hubTheme: 'Follows the hub\'s theme', hubThemeNote: 'Colours, glass, backdrop and font come from the hub\'s Settings > Display.',
  privacy: 'Privacy Policy', terms: 'Terms', agreeA: 'By creating an account you agree to the', agreeB: 'and the', deleteAccount: 'To delete your account: RoarMe > Settings > Privacy and Security > Delete My Account.', removeShotQ: 'Delete this shot?', removeSceneQ: 'Delete this scene and all its shots?',
  copyOf: 'Copy of', addImage: 'Add image', dropImage: 'Drop, paste or choose an image', removeImage: 'Remove image', replaceImage: 'Replace image',
  moveUp: 'Up', moveDown: 'Down', drag: 'Drag to reorder', saved: 'Saved', exported: 'Done', empty: 'Make your first shot list',
  emptySub: 'Scenes, shots, frames and a storyboard, plus a PDF for the crew.', start: 'Start', updateReady: 'New version ready', restart: 'Restart',
  imgError: 'This image is not accepted (PNG, JPG, WebP, GIF).', secs: 'sec', undo: 'Undo', deleted: 'Deleted',
  general: 'General', keys: 'Keyboard Shortcuts', theme: 'Theme', themeOwn: 'The theme’s own colour', text: 'Text', font: 'Font',
  layout: 'Layout', spacing: 'Spacing', tight: 'Tight', relaxed: 'Relaxed', effects: 'Effects', glassLook: 'Glass Look',
  glassHint: 'Main buttons as tinted glass, like in RoarMe.', motion: 'Smooth Animations', focusRings: 'Bold Focus Rings',
  focusHint: 'Shows clearly where you are when you move with the keyboard.', battery: 'Battery', lite: 'Power Saving Mode',
  liteHint: 'No blur and no motion, for older computers and laptops on battery.', resetAll: 'Reset All Settings',
  resetHint: 'The language stays as it is.', reset: 'Reset', resetQ: 'Put every setting back to how it started?',
  confirmDeleteHint: 'Without it, a delete is undone from the note at the bottom or with ⌘Z.', interface: 'App language',
  langNote: 'The app reloads to change language.', newLists: 'For every new list', printing: 'Printing',
  previewLine: 'Nikos walks along the water’s edge', desktopAccount: 'The RoarMe account is coming to the desktop app too.',
  heroAccount: 'Your RoarMe account, the same one everywhere.', heroGeneral: 'How RoarList behaves.',
  heroAppearance: 'Theme, colours, text and motion, as in RoarMe.', heroLanguage: 'Greek or English.',
  heroLists: 'What a new list starts with and which columns you see.', heroPdf: 'How the list and the storyboard print.', heroKeys: 'Everything from the keyboard.',
  k_search: 'Search your shot lists', k_new: 'New shot list', k_shot: 'New shot below this one', k_scene: 'New scene', k_pdf: 'PDF list',
  k_board: 'PDF storyboard', k_undo: 'Undo a delete or a move', k_settings: 'Settings', k_keys: 'This page', k_esc: 'Closes menus and windows',
  k_paste: '⌘ V on a shot', k_pasteWhat: 'The picture on the clipboard becomes its frame', k_right: 'Right click a list', k_rightWhat: 'Open, duplicate, export, delete',
  demoTitle: 'Example', demoCta: 'Make your own shot list with your RoarMe account →',
  searchPh: 'Search', openList: 'Open', rename: 'Rename', noMatch: 'Nothing matches',

  settings: 'Settings', appearance: 'Appearance', mode: 'Day and Night', modeSystem: 'Match system', modeDark: 'Dark', modeLight: 'Light',
  accent: 'Colour', radius: 'Corners', textSize: 'Text size', small: 'Small', standard: 'Standard', large: 'Large',
  language: 'Language', langSystem: 'Match system', defaults: 'New shot lists', defAspect: 'Aspect for a new list', defLens: 'Lens for the first shot',
  columns: 'Columns in the list', columnsHint: 'What you turn off is hidden from the list and the PDF. The data stays.',
  pdf: 'PDF', paper: 'Paper', pdfFrames: 'Frames in the list PDF', behaviour: 'Behaviour', confirmDelete: 'Ask before deleting a shot',
  account: 'Account', signedInAs: 'Signed in as', signOut: 'Sign out', changePassword: 'Change password', newPassword: 'New password',
  save: 'Save', passwordSaved: 'Password changed', close: 'Close', about: 'About', version: 'Version',
  cloudNote: 'Your shot lists live in your account’s cloud, on every device you sign in on.',
  localNote: 'In this app your shot lists stay on this computer. On the web (themadlions.com/roarlist) they live in your account’s cloud.',
  signIn: 'Sign in', signUp: 'New account', fullName: 'Full name', email: 'Email', password: 'Password', passwordNew: 'Password (6 characters or more)',
  forgot: 'Forgot your password?', sameAccount: 'The same account as RoarMe, Roardino and RoarMail.', working: 'One moment…',
  needEmail: 'Write your email first.', resetSent: 'We sent you an email with a link for a new password.', fillBoth: 'Fill in email and password.',
  needName: 'Write your name.', confirmSent: 'Almost there: we sent you an email. Open the link, then sign in here.',
  setNewPassword: 'Set a new password', imported: 'The shot lists on this device are now in your account', offlineErr: 'Not saved to the cloud. Check your connection.',
  err_login: 'Wrong email or password.', err_confirm: 'Your email is not confirmed yet. Open the link we sent you.',
  err_exists: 'There is already an account with this email. Sign in or ask for a new password.', err_short: 'The password needs 6 characters or more.',
  err_rate: 'Too many tries. Wait a little and try again.', err_email: 'The email does not look right.', err_other: 'Something went wrong. Try again.',
 durHint: 'mm:ss or seconds',
  values: {
    eye: 'Eye level', high: 'High', low: 'Low', dutch: 'Dutch', overhead: 'Overhead', ground: 'Ground',
    static: 'Static', pan: 'Pan', tilt: 'Tilt', push: 'Push in', pull: 'Pull out', dolly: 'Dolly', track: 'Tracking', handheld: 'Handheld',
    steadicam: 'Steadicam', gimbal: 'Gimbal', crane: 'Crane', drone: 'Drone', zoom: 'Zoom',
  },
}


const chosen = settings().language
export const lang = chosen !== 'system' ? chosen : (navigator.language || 'en').toLowerCase().startsWith('el') ? 'el' : 'en'
export const t = lang === 'el' ? el : en
// Privacy Policy and Terms (Alex, 25 Oct): on the company site, both on one page
export const LEGAL = `https://themadlions.com/legal/roarlist/${lang === 'el' ? '?lang=el' : ''}`
export const val = (k: string) => (k ? t.values[k] || k : '')

export const printLabels = (): PrintLabels => ({
  scene: t.scene, shot: t.shot, frame: t.frame, size: t.size, angle: t.angle, move: t.move, lens: t.lens, description: t.description,
  cast: t.cast, duration: t.duration, notes: t.notes, client: t.client, director: t.director, dop: t.dop, date: t.date,
  shots: t.shots, total: t.total, done: t.done, values: t.values,
  paper: settings().paper,
  hide: COLS.filter((c) => settings().columns[c] === false || (c === 'frame' && !settings().pdfFrames)),
})
const COLS = ['frame', 'size', 'angle', 'move', 'lens', 'cast', 'duration', 'notes']
