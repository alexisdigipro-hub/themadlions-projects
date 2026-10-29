// Privacy Policy and Terms for the Lab's apps and the company site (Alex, 25 Oct 2026: "privacy policy & terms for
// every app, on each app's page and in the apps"). One page per app at legal/<id>/ with both texts (#privacy, #terms),
// English and Greek with the site's switch, plus legal/ listing them all. RoarMe and RoarTransfer keep their own
// (RoarMe ?legal=privacy, roartransfer.com/privacy); the list links to them.
// Only what the code of each app does (RoarMail 0.15, RoarList 0.4, RoarWriter 0.5, RoarKit 0.4, Roardino, the site).
//
//   node scripts/site-legal.mjs public/site      then copy legal/ into themadlions-site with the rest
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) { console.error('usage: node scripts/site-legal.mjs <site dir>'); process.exit(1) }
const UPDATED = { en: '25 October 2026', el: '25 Οκτωβρίου 2026' }
const LAB = 'lab@themadlions.com', INFO = 'info@themadlions.com'
const ROARME_DEL = { en: 'RoarMe > Settings > Privacy and Security > Delete My Account', el: 'RoarMe > Settings > Privacy and Security > Delete My Account' }

// the parts every text ends with
const rights = (mail) => ({
  en: [
    ['Your rights', [`Under the GDPR you can ask to see, correct, export or delete your data, and you can object to its use. Write to ${mail} and we answer within one month. You can also complain to the Hellenic Data Protection Authority (www.dpa.gr).`]],
    ['Changes', ['If this policy changes, the date at the top changes too, and anything important is shown in the app before it applies.']],
    ['Contact', [`The Mad Lions, Athens, Greece · ${mail}`]],
  ],
  el: [
    ['Τα δικαιώματά σου', [`Με βάση τον GDPR μπορείς να ζητήσεις να δεις, να διορθώσεις, να πάρεις ή να διαγράψεις τα δεδομένα σου, και να αρνηθείς τη χρήση τους. Γράψε στο ${mail} και απαντάμε μέσα σε έναν μήνα. Μπορείς επίσης να κάνεις καταγγελία στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (www.dpa.gr).`]],
    ['Αλλαγές', ['Αν αλλάξει αυτή η πολιτική, αλλάζει και η ημερομηνία στην κορυφή, και ό,τι σημαντικό το βλέπεις στην εφαρμογή πριν ισχύσει.']],
    ['Επικοινωνία', [`The Mad Lions, Αθήνα · ${mail}`]],
  ],
})
const termsEnd = (app, mail) => ({
  en: [
    ['Free, and in beta', [`${app} is free and still in beta. It may change, gain or lose features, or stop, and we will try to tell you in good time. If a paid plan ever comes, its price is shown first and nothing is charged without your clear order.`]],
    ['No guarantee', [`${app} is given as it is. We work hard for it to be right and safe, but we cannot promise it will always work, or work without mistakes. Keep your own copies of anything that matters.`]],
    ['Liability', ['As far as the law allows, we are not liable for indirect losses, lost data, lost profit or lost work from using the app. Nothing here limits rights you have as a consumer that cannot be limited by law.']],
    ['Law', ['These terms follow Greek law, and the courts of Athens decide any dispute, unless the law where you live as a consumer says otherwise.']],
    ['Contact', [`The Mad Lions, Athens, Greece · ${mail}`]],
  ],
  el: [
    ['Δωρεάν, και σε beta', [`Το ${app} είναι δωρεάν και ακόμα σε beta. Μπορεί να αλλάξει, να πάρει ή να χάσει λειτουργίες, ή να σταματήσει, και θα προσπαθούμε να σε ενημερώνουμε έγκαιρα. Αν κάποτε έρθει πληρωμένη έκδοση, βλέπεις πρώτα την τιμή και τίποτα δεν χρεώνεται χωρίς τη δική σου ρητή εντολή.`]],
    ['Χωρίς εγγύηση', [`Το ${app} δίνεται όπως είναι. Δουλεύουμε για να είναι σωστό και ασφαλές, αλλά δεν μπορούμε να υποσχεθούμε ότι θα δουλεύει πάντα, ή χωρίς λάθη. Κράτα δικά σου αντίγραφα για ό,τι μετράει.`]],
    ['Ευθύνη', ['Όσο το επιτρέπει ο νόμος, δεν ευθυνόμαστε για έμμεσες ζημιές, χαμένα δεδομένα, χαμένο κέρδος ή χαμένη δουλειά από τη χρήση της εφαρμογής. Τίποτα εδώ δεν περιορίζει δικαιώματα που έχεις ως καταναλωτής και ο νόμος δεν επιτρέπει να περιοριστούν.']],
    ['Δίκαιο', ['Οι όροι αυτοί διέπονται από το ελληνικό δίκαιο, και για κάθε διαφορά αρμόδια είναι τα δικαστήρια της Αθήνας, εκτός αν ο νόμος του τόπου όπου ζεις ως καταναλωτής ορίζει κάτι άλλο.']],
    ['Επικοινωνία', [`The Mad Lions, Αθήνα · ${mail}`]],
  ],
})
const account = {
  en: ['Your account', ['The account is your RoarMe account: the same email and password sign you in to RoarMe, RoarList on the web, RoarWriter, Roardino and RoarTransfer. You must be 15 or older. Keep your password safe and tell us if you think someone else is using it.']],
  el: ['Ο λογαριασμός σου', ['Ο λογαριασμός είναι ο λογαριασμός σου στο RoarMe: το ίδιο email και ο ίδιος κωδικός σε βάζουν στο RoarMe, στο RoarList στον browser, στο RoarWriter, στο Roardino και στο RoarTransfer. Πρέπει να είσαι 15 ετών και άνω. Φύλαγε τον κωδικό σου και πες μας αν πιστεύεις ότι τον χρησιμοποιεί κάποιος άλλος.']],
}
const yours = (what) => ({
  en: ['What you make is yours', [`${what.en} belong to you. We keep them only to store them, sync them and show them to you and to the people you choose. We do not use them for anything else, and never to train AI.`, 'Do not use the app for anything illegal, or with material that breaks someone else\'s rights.']],
  el: ['Ό,τι φτιάχνεις είναι δικό σου', [`${what.el} ανήκουν σε σένα. Τα κρατάμε μόνο για να τα αποθηκεύουμε, να τα συγχρονίζουμε και να τα δείχνουμε σε σένα και σε όσους διαλέγεις. Δεν τα χρησιμοποιούμε για τίποτα άλλο, και ποτέ για εκπαίδευση AI.`, 'Μη χρησιμοποιείς την εφαρμογή για κάτι παράνομο, ή με υλικό που παραβιάζει δικαιώματα άλλων.']],
})
const updates = (repo) => ({
  en: `The Mac and Windows app checks every two hours for a new version at GitHub (api.github.com/repos/alexisdigipro-hub/${repo}) and downloads it from there. GitHub sees your IP address, as with any download; nothing about you or your work is sent.`,
  el: `Η εφαρμογή για Mac και Windows ελέγχει κάθε δύο ώρες για νέα έκδοση στο GitHub (api.github.com/repos/alexisdigipro-hub/${repo}) και την κατεβάζει από εκεί. Το GitHub βλέπει τη διεύθυνση IP σου, όπως σε κάθε λήψη· τίποτα για σένα ή τη δουλειά σου δεν στέλνεται.`,
})
const fonts = {
  en: 'Fonts load from Google Fonts (fonts.googleapis.com), so Google sees your IP address when they load.',
  el: 'Οι γραμματοσειρές φορτώνουν από το Google Fonts (fonts.googleapis.com), οπότε η Google βλέπει τη διεύθυνση IP σου όταν φορτώνουν.',
}
const where = {
  en: 'Accounts and cloud data are stored with Supabase, our database and storage provider, in London, United Kingdom (covered by the EU\'s adequacy decision for the UK). It acts on our behalf and keeps short technical logs. We do not sell data, show ads, or use analytics or trackers.',
  el: 'Οι λογαριασμοί και τα δεδομένα στο cloud φυλάσσονται στη Supabase, τον πάροχο βάσης δεδομένων και αποθήκευσης που χρησιμοποιούμε, στο Λονδίνο (το Ηνωμένο Βασίλειο καλύπτεται από απόφαση επάρκειας της ΕΕ). Ενεργεί για λογαριασμό μας και κρατά σύντομα τεχνικά logs. Δεν πουλάμε δεδομένα, δεν δείχνουμε διαφημίσεις, δεν έχουμε analytics ή trackers.',
}
const join2 = (a, b) => ({ en: [...a.en, ...b.en], el: [...a.el, ...b.el] })

const APPS = [
  {
    id: 'roarmail', name: 'RoarMail', page: 'lab/roarmail/', what: { en: 'the mail app for Mac and Windows', el: 'η εφαρμογή email για Mac και Windows' },
    privacy: join2({
      en: [
        ['In short', ['RoarMail talks to your mail servers straight from your computer. There is no server of ours in between: we never see your mail, your contacts or your passwords.']],
        ['What stays on your computer', [
          'Your messages, folders, drafts and attachments are kept on your computer (a local database and the message files in the app\'s folder), so they open fast and offline.',
          'Mail passwords are locked with your computer\'s own key store (Keychain on Mac, DPAPI on Windows) and are only sent to your own mail servers.',
          'Your settings, signatures and rules stay on your computer too. Remove account, Clear cache and Reset settings in the app delete them.',
        ]],
        ['What leaves your computer, and to whom', [
          'Your mail servers (IMAP and SMTP), to fetch and send your mail. They are run by your mail provider, under its own policy.',
          'Setting up an account: only the domain of your address (for example example.com) is looked up in Thunderbird\'s public server list (autoconfig.thunderbird.net) and at your domain.',
          'Sender pictures (on unless you turn them off in Settings > Appearance, and off in Privacy mode): for a person, a scrambled code of their address (MD5) goes to Gravatar; for a company, its domain goes to Google\'s and DuckDuckGo\'s icon services. The pictures are kept on your computer.',
          'Pictures inside messages load only when you allow them, per message or per sender; tracking pixels stay blocked either way. Unsubscribe in one click contacts the sender only after you confirm.',
          updates('roarmail').en,
        ]],
        ['With your RoarMe account (only if you sign in)', [
          'Signing in to RoarMe in RoarMail is optional. When you send an email to a RoarMe chat, the chat gets its subject, sender, date, a short extract (up to 600 characters) and the attachments you keep (up to 50 MB each). A task made from an email is saved in RoarMe with a link back to it.',
          'A large attachment sent as a link goes to RoarTransfer (Cloudflare R2) for the days shown, and is deleted after.',
          'These follow the RoarMe and RoarTransfer privacy policies.',
        ]],
        ['What we do not do', ['No analytics, no trackers, no ads, no AI on your mail. Nothing is sold or shared.']],
      ],
      el: [
        ['Με λίγα λόγια', ['Το RoarMail μιλά με τους mail servers σου κατευθείαν από τον υπολογιστή σου. Δεν υπάρχει δικός μας server ανάμεσα: δεν βλέπουμε ποτέ τα email, τις επαφές ή τους κωδικούς σου.']],
        ['Τι μένει στον υπολογιστή σου', [
          'Τα μηνύματα, οι φάκελοι, τα πρόχειρα και τα συνημμένα σου φυλάσσονται στον υπολογιστή σου (τοπική βάση δεδομένων και τα αρχεία των μηνυμάτων στον φάκελο της εφαρμογής), για να ανοίγουν γρήγορα και χωρίς σύνδεση.',
          'Οι κωδικοί των email κλειδώνονται με το σύστημα κλειδιών του υπολογιστή σου (Keychain στο Mac, DPAPI στα Windows) και στέλνονται μόνο στους δικούς σου mail servers.',
          'Οι ρυθμίσεις, οι υπογραφές και οι κανόνες σου μένουν κι αυτά στον υπολογιστή. Η Αφαίρεση λογαριασμού, ο Καθαρισμός cache και η Επαναφορά ρυθμίσεων στην εφαρμογή τα σβήνουν.',
        ]],
        ['Τι φεύγει από τον υπολογιστή σου, και πού', [
          'Οι mail servers σου (IMAP και SMTP), για να φέρνουν και να στέλνουν τα email σου. Τους έχει ο πάροχος του email σου, με τη δική του πολιτική.',
          'Στη ρύθμιση λογαριασμού: μόνο το domain της διεύθυνσής σου (π.χ. example.com) ψάχνεται στη δημόσια λίστα servers του Thunderbird (autoconfig.thunderbird.net) και στο ίδιο το domain.',
          'Εικόνες αποστολέων (ανοιχτό, εκτός αν το κλείσεις στις Ρυθμίσεις > Εμφάνιση, και κλειστό στη Λειτουργία απορρήτου): για ένα πρόσωπο, ένας κρυπτογραφημένος κωδικός της διεύθυνσης (MD5) πάει στο Gravatar· για μια εταιρεία, το domain της πάει στις υπηρεσίες εικονιδίων της Google και του DuckDuckGo. Οι εικόνες φυλάσσονται στον υπολογιστή σου.',
          'Οι εικόνες μέσα στα μηνύματα φορτώνουν μόνο όταν το επιτρέψεις, ανά μήνυμα ή ανά αποστολέα· τα tracking pixels μένουν πάντα μπλοκαρισμένα. Η διαγραφή από λίστα με ένα κλικ επικοινωνεί με τον αποστολέα μόνο αφού επιβεβαιώσεις.',
          updates('roarmail').el,
        ]],
        ['Με τον λογαριασμό RoarMe (μόνο αν συνδεθείς)', [
          'Η σύνδεση στο RoarMe μέσα από το RoarMail είναι προαιρετική. Όταν στέλνεις ένα email σε συνομιλία του RoarMe, η συνομιλία παίρνει το θέμα, τον αποστολέα, την ημερομηνία, ένα μικρό απόσπασμα (ως 600 χαρακτήρες) και τα συνημμένα που κρατάς (ως 50 MB το καθένα). Ένα task από email αποθηκεύεται στο RoarMe με σύνδεσμο πίσω σε αυτό.',
          'Ένα μεγάλο συνημμένο που στέλνεται ως link πάει στο RoarTransfer (Cloudflare R2) για τις μέρες που φαίνονται, και μετά σβήνεται.',
          'Αυτά ακολουθούν τις πολιτικές απορρήτου του RoarMe και του RoarTransfer.',
        ]],
        ['Τι δεν κάνουμε', ['Κανένα analytics, κανένας tracker, καμία διαφήμιση, κανένα AI στα email σου. Τίποτα δεν πουλιέται ούτε μοιράζεται.']],
      ],
    }, rights(LAB)),
    terms: join2({
      en: [
        ['Using RoarMail', ['RoarMail is a mail program: you add your own mail accounts and you are responsible for them, and for what you send. Use an app password where your provider asks for one. Follow your mail provider\'s rules.']],
        ['Your mail is yours', ['We never receive your mail, so we have no rights in it and cannot read it. Do not use RoarMail to send spam or anything illegal.']],
      ],
      el: [
        ['Η χρήση του RoarMail', ['Το RoarMail είναι πρόγραμμα email: προσθέτεις τους δικούς σου λογαριασμούς και είσαι υπεύθυνος γι’ αυτούς, και για ό,τι στέλνεις. Χρησιμοποίησε app password όπου το ζητά ο πάροχός σου. Ακολούθησε τους κανόνες του παρόχου σου.']],
        ['Τα email σου είναι δικά σου', ['Δεν παίρνουμε ποτέ τα email σου, οπότε δεν έχουμε κανένα δικαίωμα πάνω τους και δεν μπορούμε να τα διαβάσουμε. Μη χρησιμοποιείς το RoarMail για spam ή για κάτι παράνομο.']],
      ],
    }, termsEnd('RoarMail', LAB)),
  },
  {
    id: 'roarlist', name: 'RoarList', page: 'lab/roarlist/', what: { en: 'shot lists and storyboards', el: 'shot lists και storyboards' },
    privacy: join2({
      en: [
        ['In short', ['On Mac and Windows your shot lists stay on your computer and there is no account. In the browser (themadlions.com/roarlist) they are kept in your RoarMe account so they follow you to any device.']],
        ['The Mac and Windows app', [
          'Each shot list (title, client, director, DoP, date, notes, scenes and shots with their cast, lens and the rest) and the frames you add are saved in the app\'s folder on your computer. Deleting a list moves it to your computer\'s Trash.',
          'The look, the language and the screen you were on are kept on your computer.',
          updates('roarlist').en,
        ]],
        ['In the browser', [
          'You sign in with your RoarMe account (name, email, password). Your shot lists and your settings are saved in it, and the frames in a private store that only you can open.',
          'Lists made before you signed in are kept in your browser, and move to your account the first time you sign in.',
          'Deleting a list in the browser deletes it and its frames from your account for good. Frames no shot uses any more are cleaned up when you open the list.',
          'Your sign-in is kept in your browser until you sign out.',
        ]],
        ['Other services', [
          'Only if you pick a font other than the default, it loads from Google Fonts, so Google sees your IP address.',
          'Exports (PDF, a web page, a .roarlist file) are made on your device and go only where you send them. There are no share links.',
        ]],
        ['Where it is, and who sees it', [where.en, 'Nobody else sees your shot lists. An administrator of the system can technically reach the database, and only does so to fix a problem.']],
        ['How to delete it', [`Delete a list in the app. To delete everything, delete your RoarMe account (${ROARME_DEL.en}): your shot lists and settings go with it. If anything is left over, write to us and we remove it.`]],
      ],
      el: [
        ['Με λίγα λόγια', ['Σε Mac και Windows τα shot lists σου μένουν στον υπολογιστή σου και δεν υπάρχει λογαριασμός. Στον browser (themadlions.com/roarlist) φυλάσσονται στον λογαριασμό σου στο RoarMe, για να σε ακολουθούν σε κάθε συσκευή.']],
        ['Η εφαρμογή για Mac και Windows', [
          'Κάθε shot list (τίτλος, πελάτης, σκηνοθέτης, DoP, ημερομηνία, σημειώσεις, σκηνές και πλάνα με το cast, τον φακό και τα υπόλοιπα) και τα καρέ που προσθέτεις αποθηκεύονται στον φάκελο της εφαρμογής στον υπολογιστή σου. Η διαγραφή ενός list το πηγαίνει στον Κάδο του υπολογιστή.',
          'Η εμφάνιση, η γλώσσα και η οθόνη που ήσουν φυλάσσονται στον υπολογιστή σου.',
          updates('roarlist').el,
        ]],
        ['Στον browser', [
          'Συνδέεσαι με τον λογαριασμό σου στο RoarMe (όνομα, email, κωδικός). Τα shot lists και οι ρυθμίσεις σου αποθηκεύονται σε αυτόν, και τα καρέ σε ιδιωτικό χώρο που ανοίγεις μόνο εσύ.',
          'Όσα lists φτιάχτηκαν πριν συνδεθείς φυλάσσονται στον browser σου, και περνούν στον λογαριασμό σου την πρώτη φορά που συνδέεσαι.',
          'Η διαγραφή ενός list στον browser το σβήνει οριστικά από τον λογαριασμό σου, μαζί με τα καρέ του. Καρέ που δεν τα χρησιμοποιεί πια κανένα πλάνο καθαρίζονται όταν ανοίγεις το list.',
          'Η σύνδεσή σου φυλάσσεται στον browser ώσπου να αποσυνδεθείς.',
        ]],
        ['Άλλες υπηρεσίες', [
          'Μόνο αν διαλέξεις άλλη γραμματοσειρά από την προεπιλογή, φορτώνει από το Google Fonts, οπότε η Google βλέπει τη διεύθυνση IP σου.',
          'Οι εξαγωγές (PDF, ιστοσελίδα, αρχείο .roarlist) γίνονται στη συσκευή σου και πάνε μόνο όπου τις στέλνεις. Δεν υπάρχουν links κοινοποίησης.',
        ]],
        ['Πού είναι, και ποιος τα βλέπει', [where.el, 'Κανείς άλλος δεν βλέπει τα shot lists σου. Ένας διαχειριστής του συστήματος έχει τεχνικά πρόσβαση στη βάση, και τη χρησιμοποιεί μόνο για να λύσει κάποιο πρόβλημα.']],
        ['Πώς τα σβήνεις', [`Σβήσε ένα list μέσα στην εφαρμογή. Για να σβήσεις τα πάντα, διάγραψε τον λογαριασμό σου στο RoarMe (${ROARME_DEL.el}): τα shot lists και οι ρυθμίσεις σου φεύγουν μαζί του. Αν μείνει κάτι, γράψε μας και το σβήνουμε.`]],
      ],
    }, rights(LAB)),
    terms: join2({ en: [account.en, yours({ en: 'Your shot lists and frames', el: 'Τα shot lists και τα καρέ σου' }).en], el: [account.el, yours({ en: 'Your shot lists and frames', el: 'Τα shot lists και τα καρέ σου' }).el] }, termsEnd('RoarList', LAB)),
  },
  {
    id: 'roarwriter', name: 'RoarWriter', page: 'lab/roarwriter/', what: { en: 'the screenwriting app', el: 'η εφαρμογή σεναρίου' },
    privacy: join2({
      en: [
        ['In short', ['RoarWriter keeps your scripts in your RoarMe account and a copy on your device, so you can write offline. The AI only runs when you press one of its buttons, and only reads what that task needs.']],
        ['What we keep', [
          'Your account: name, email and password (as a secure hash), from RoarMe.',
          'Your scripts, with everything in them: the title page (including the contact you write there), the text, notes, cards, beats, storyboards, schedules, revisions and saved AI reports.',
          'Versions: the ones you save, and one automatic version a day when you open a script.',
          'Storyboard pictures, made smaller and saved again as JPEG on your device before they upload, in a private store.',
          'On your device: a copy of every script, edits waiting to be sent, and your preferences (which can hold your name, credit and contact for the title page).',
        ]],
        ['Writing together', [
          'You can share a script by email, to edit or only to view. The person gets it once they sign in with that email. Everyone a script is shared with sees it, its versions and its pictures.',
          'While a script is open, the people in it see each other\'s name, email and the scene they are on. This is saved every few seconds and shown only for the last 30 seconds.',
          'Only the owner can share, change who sees it, or delete it.',
        ]],
        ['The AI', [
          'The AI is Anthropic\'s Claude, called through our own server function. It runs only when you ask: a scene task (dialogue, rewrite, continue, ideas) sends that scene, the part before it and the character names; a whole-script task (ask, coverage, continuity, budget, package, beats, pacing) sends the whole script; translate sends the lines in parts; Research also lets Claude search the web.',
          'Our function does not save what you send or what comes back. Anthropic handles it under its commercial terms, which do not use it to train its models. What you insert into your script is saved with it.',
        ]],
        ['Other services', [
          'Dictation in the browser uses its own speech service (in Chrome, Google\'s). Read aloud uses your device\'s voices.',
          fonts.en,
          updates('roarwriter').en,
          'The web version is served by GitHub Pages.',
        ]],
        ['Where it is, and who sees it', [where.en, 'Nobody sees your scripts except you and the people you share them with. An administrator of the system can technically reach the database, and only does so to fix a problem.']],
        ['How to delete it', [`Deleting a script (only its owner can) deletes it with its shares and versions. To delete everything, delete your RoarMe account (${ROARME_DEL.en}): your scripts go with it. If anything is left over, for example storyboard pictures, write to us and we remove it.`]],
      ],
      el: [
        ['Με λίγα λόγια', ['Το RoarWriter κρατά τα σενάριά σου στον λογαριασμό σου στο RoarMe και ένα αντίγραφο στη συσκευή σου, για να γράφεις και χωρίς σύνδεση. Το AI τρέχει μόνο όταν πατήσεις ένα από τα κουμπιά του, και διαβάζει μόνο ό,τι χρειάζεται η συγκεκριμένη δουλειά.']],
        ['Τι κρατάμε', [
          'Τον λογαριασμό σου: όνομα, email και κωδικό (ως ασφαλές hash), από το RoarMe.',
          'Τα σενάριά σου, με ό,τι έχουν μέσα: τη σελίδα τίτλου (μαζί με την επαφή που γράφεις εκεί), το κείμενο, σημειώσεις, κάρτες, beats, storyboards, προγράμματα γυρισμάτων, αναθεωρήσεις και αποθηκευμένες αναφορές του AI.',
          'Εκδόσεις: όσες αποθηκεύεις, και μία αυτόματη την ημέρα όταν ανοίγεις ένα σενάριο.',
          'Τις εικόνες του storyboard, μικραίνουν και ξανασώζονται ως JPEG στη συσκευή σου πριν ανέβουν, σε ιδιωτικό χώρο.',
          'Στη συσκευή σου: ένα αντίγραφο κάθε σεναρίου, αλλαγές που περιμένουν να σταλούν, και τις προτιμήσεις σου (που μπορεί να έχουν όνομα, credit και επαφή για τη σελίδα τίτλου).',
        ]],
        ['Γράψιμο μαζί', [
          'Μπορείς να μοιραστείς ένα σενάριο με email, για επεξεργασία ή μόνο για ανάγνωση. Ο άλλος το παίρνει μόλις συνδεθεί με αυτό το email. Όλοι όσοι το έχουν βλέπουν το σενάριο, τις εκδόσεις και τις εικόνες του.',
          'Όσο ένα σενάριο είναι ανοιχτό, όσοι είναι μέσα βλέπουν ο ένας του άλλου το όνομα, το email και τη σκηνή όπου βρίσκονται. Αποθηκεύεται κάθε λίγα δευτερόλεπτα και φαίνεται μόνο για τα τελευταία 30 δευτερόλεπτα.',
          'Μόνο ο ιδιοκτήτης μπορεί να το μοιραστεί, να αλλάξει ποιος το βλέπει, ή να το σβήσει.',
        ]],
        ['Το AI', [
          'Το AI είναι το Claude της Anthropic, μέσα από δική μας συνάρτηση στον server. Τρέχει μόνο όταν το ζητάς: μια δουλειά σκηνής (διάλογος, ξαναγράψιμο, συνέχεια, ιδέες) στέλνει τη σκηνή, το κομμάτι πριν από αυτή και τα ονόματα των χαρακτήρων· μια δουλειά σε όλο το σενάριο (ερώτηση, coverage, continuity, budget, package, beats, ρυθμός) στέλνει όλο το σενάριο· η μετάφραση στέλνει τις γραμμές σε κομμάτια· η Έρευνα αφήνει και το Claude να ψάξει στο διαδίκτυο.',
          'Η συνάρτησή μας δεν αποθηκεύει ό,τι στέλνεις ή ό,τι γυρίζει. Η Anthropic το χειρίζεται με τους εμπορικούς της όρους, που δεν το χρησιμοποιούν για εκπαίδευση των μοντέλων της. Ό,τι βάζεις στο σενάριό σου αποθηκεύεται μαζί του.',
        ]],
        ['Άλλες υπηρεσίες', [
          'Η υπαγόρευση στον browser χρησιμοποιεί τη δική του υπηρεσία ομιλίας (στο Chrome, της Google). Η ανάγνωση φωναχτά χρησιμοποιεί τις φωνές της συσκευής σου.',
          fonts.el,
          updates('roarwriter').el,
          'Η έκδοση για τον browser σερβίρεται από το GitHub Pages.',
        ]],
        ['Πού είναι, και ποιος τα βλέπει', [where.el, 'Κανείς δεν βλέπει τα σενάριά σου εκτός από σένα και όσους τα μοιράζεσαι. Ένας διαχειριστής του συστήματος έχει τεχνικά πρόσβαση στη βάση, και τη χρησιμοποιεί μόνο για να λύσει κάποιο πρόβλημα.']],
        ['Πώς τα σβήνεις', [`Η διαγραφή ενός σεναρίου (μόνο από τον ιδιοκτήτη) το σβήνει μαζί με τις κοινοποιήσεις και τις εκδόσεις του. Για να σβήσεις τα πάντα, διάγραψε τον λογαριασμό σου στο RoarMe (${ROARME_DEL.el}): τα σενάριά σου φεύγουν μαζί του. Αν μείνει κάτι, για παράδειγμα εικόνες storyboard, γράψε μας και το σβήνουμε.`]],
      ],
    }, rights(LAB)),
    terms: join2({
      en: [account.en, yours({ en: 'Your scripts, and what the AI writes into them', el: 'Τα σενάριά σου, και ό,τι γράφει μέσα τους το AI' }).en,
        ['The AI', ['The AI can be wrong, and can write something that sounds like an existing work. Read what it gives you before you use it; nothing changes in your script until you press Insert or Replace. Budgets, schedules and coverage from it are a starting point, not advice.']],
        ['Sharing', ['When you share a script you decide who sees it. People you share with must respect that it is yours.']]],
      el: [account.el, yours({ en: 'Your scripts, and what the AI writes into them', el: 'Τα σενάριά σου, και ό,τι γράφει μέσα τους το AI' }).el,
        ['Το AI', ['Το AI μπορεί να κάνει λάθος, και να γράψει κάτι που μοιάζει με υπάρχον έργο. Διάβασε ό,τι σου δίνει πριν το χρησιμοποιήσεις· τίποτα δεν αλλάζει στο σενάριό σου ώσπου να πατήσεις Insert ή Replace. Budgets, προγράμματα και coverage από αυτό είναι αφετηρία, όχι συμβουλή.']],
        ['Κοινοποίηση', ['Όταν μοιράζεσαι ένα σενάριο, εσύ αποφασίζεις ποιος το βλέπει. Όσοι το παίρνουν πρέπει να σέβονται ότι είναι δικό σου.']]],
    }, termsEnd('RoarWriter', LAB)),
  },
  {
    // RoarTwin became RoarKit, a toolbox (Alex, 28 and 29 Oct); legal/roartwin/ redirects here (written below), since
    // RoarTwin 0.4 and older link to it. Only what RoarKit 0.4's code does.
    id: 'roarkit', name: 'RoarKit', page: 'lab/roarkit/', updated: { en: '29 October 2026', el: '29 Οκτωβρίου 2026' },
    what: { en: 'the toolbox for the computer and the shoot, for Mac and Windows', el: 'η εργαλειοθήκη για τον υπολογιστή και το γύρισμα, σε Mac και Windows' },
    privacy: join2({
      en: [
        ['In short', ['RoarKit works only on your computer. There is no account and no server of ours: your files, their names, your passwords and what it finds never leave your computer.']],
        ['What it reads', [
          'Only the folders, drives and files you choose: their names, sizes and dates, samples of their bytes and their fingerprints (SHA-256 and MD5), and for videos, pictures and sound their details and a few frames and moments, read by the ffmpeg that comes with the app (on a Mac also by the system\'s own mdls).',
          'Clean up and the Overview look only inside the folders where programs keep their caches, to measure them. Cloud-drive folders (iCloud, Dropbox, pCloud and the like) are skipped unless you turn that off, so it does not make them download your files.',
          'Computer stats and the Overview read what the system says of itself: processor, memory, drives, network, heat level, battery and the names of the programs using the most. They are shown, not kept.',
          'It looks for camera cards when one is plugged in, by listing your drives every few seconds. Drive health asks each drive for its own health report (SMART).',
        ]],
        ['What it keeps and writes', [
          'Your settings, chosen folders, favourites, naming rules and the last renaming (for Undo) are kept in the app\'s folder on your computer.',
          'The Vault is one file in that folder, sealed with AES-256-GCM under a key made from your master password (scrypt). The master password is not stored anywhere, so neither we nor anyone else can open the vault or bring a forgotten master password back. A password you copy is cleared from the clipboard after 30 seconds.',
          'Make a twin writes the copies, a copy report and an ASC MHL on the drives you pick. Reports, contact sheets, archives and lists are written where you say. The speed test writes a test file on the drive you test and removes it.',
          'It never deletes your files: it only moves the ones you confirm to the Trash, one of each group always stays, and nothing in a Masters folder is ever touched. Copies, moves and renames never write over a file.',
        ]],
        ['What leaves your computer', [
          updates('roartwin').en,
          'The internet speed test in Computer stats, only when you press it, downloads and uploads test data to Cloudflare (speed.cloudflare.com), which sees your IP address. No file of yours is sent.',
          'Nothing else. No analytics, no trackers, no AI, no account.',
        ]],
      ],
      el: [
        ['Με λίγα λόγια', ['Το RoarKit δουλεύει μόνο στον υπολογιστή σου. Δεν υπάρχει λογαριασμός ούτε δικός μας server: τα αρχεία σου, τα ονόματά τους, οι κωδικοί σου και ό,τι βρίσκει δεν φεύγουν ποτέ από τον υπολογιστή σου.']],
        ['Τι διαβάζει', [
          'Μόνο τους φακέλους, τους δίσκους και τα αρχεία που διαλέγεις: ονόματα, μεγέθη και ημερομηνίες, δείγματα από τα bytes τους και τα αποτυπώματά τους (SHA-256 και MD5), και για βίντεο, εικόνες και ήχο τα στοιχεία τους και λίγα καρέ και στιγμές, που τα διαβάζει το ffmpeg που έρχεται με την εφαρμογή (σε Mac και το mdls του ίδιου του συστήματος).',
          'Ο Καθαρισμός και η Επισκόπηση κοιτάνε μόνο μέσα στους φακέλους όπου τα προγράμματα κρατάνε τις cache τους, για να τις μετρήσουν. Οι φάκελοι cloud (iCloud, Dropbox, pCloud κ.λπ.) παραλείπονται εκτός αν το κλείσεις, για να μην κατεβάσουν τα αρχεία σου.',
          'Τα Στατιστικά υπολογιστή και η Επισκόπηση διαβάζουν ό,τι λέει το σύστημα για τον εαυτό του: επεξεργαστή, μνήμη, δίσκους, δίκτυο, επίπεδο θερμότητας, μπαταρία και τα ονόματα των προγραμμάτων που τον ζορίζουν. Φαίνονται, δεν κρατιούνται.',
          'Ψάχνει για κάρτες κάμερας όταν μπαίνει μία, κοιτώντας τους δίσκους σου κάθε λίγα δευτερόλεπτα. Η Υγεία δίσκων ζητάει από κάθε δίσκο τη δική του αναφορά υγείας (SMART).',
        ]],
        ['Τι κρατά και τι γράφει', [
          'Οι ρυθμίσεις, οι φάκελοι που διάλεξες, τα αγαπημένα, οι κανόνες ονομάτων και η τελευταία μετονομασία (για την Αναίρεση) φυλάσσονται στον φάκελο της εφαρμογής στον υπολογιστή σου.',
          'Το Vault είναι ένα αρχείο σε αυτόν τον φάκελο, κλειδωμένο με AES-256-GCM με κλειδί που βγαίνει από τον κύριο κωδικό σου (scrypt). Ο κύριος κωδικός δεν φυλάσσεται πουθενά, οπότε ούτε εμείς ούτε κανείς άλλος μπορεί να ανοίξει το vault ή να φέρει πίσω έναν ξεχασμένο κύριο κωδικό. Ένας κωδικός που αντιγράφεις σβήνεται από το πρόχειρο μετά από 30 δευτερόλεπτα.',
          'Το Δίδυμο αντίγραφο γράφει τα αντίγραφα, μια αναφορά αντιγραφής και ένα ASC MHL στους δίσκους που διαλέγεις. Αναφορές, contact sheets, συμπιεσμένα και λίστες γράφονται όπου πεις. Το τεστ ταχύτητας γράφει ένα αρχείο δοκιμής στον δίσκο που ελέγχεις και το σβήνει.',
          'Δεν σβήνει ποτέ τα αρχεία σου: μόνο μετακινεί στον Κάδο όσα επιβεβαιώνεις, ένα από κάθε ομάδα μένει πάντα, και τίποτα σε φάκελο Masters δεν αγγίζεται ποτέ. Αντιγραφές, μετακινήσεις και μετονομασίες δεν γράφουν ποτέ πάνω σε αρχείο.',
        ]],
        ['Τι φεύγει από τον υπολογιστή σου', [
          updates('roartwin').el,
          'Το speedtest του internet στα Στατιστικά υπολογιστή, μόνο όταν το πατήσεις, κατεβάζει και ανεβάζει δεδομένα δοκιμής στο Cloudflare (speed.cloudflare.com), που βλέπει τη διεύθυνση IP σου. Κανένα αρχείο σου δεν στέλνεται.',
          'Τίποτα άλλο. Κανένα analytics, κανένας tracker, κανένα AI, κανένας λογαριασμός.',
        ]],
      ],
    }, rights(LAB)),
    terms: join2({
      en: [
        ['Using RoarKit', ['RoarKit shows you what takes space, what is the same and what is wrong; you decide what goes. Look before you move anything to the Trash, and empty the Trash only when you are sure. A copy made by Make a twin is checked byte for byte, but keep more than one backup of anything you cannot shoot again.']],
        ['Your passwords', ['Choose a master password you will remember and write it down somewhere safe: without it the Vault cannot be opened, by you or by us. Keep a backup of the vault on another drive.']],
        ['Your files are yours', ['We never receive your files, your passwords or anything about them.']],
      ],
      el: [
        ['Η χρήση του RoarKit', ['Το RoarKit σου δείχνει τι πιάνει χώρο, τι είναι ίδιο και τι δεν πάει καλά· εσύ αποφασίζεις τι φεύγει. Κοίτα πριν μετακινήσεις κάτι στον Κάδο, και άδειασε τον Κάδο μόνο όταν είσαι σίγουρος. Ένα αντίγραφο από το Δίδυμο αντίγραφο ελέγχεται byte προς byte, αλλά κράτα παραπάνω από ένα backup για ό,τι δεν ξαναγυρίζεται.']],
        ['Οι κωδικοί σου', ['Διάλεξε έναν κύριο κωδικό που θα θυμάσαι και γράψ’ τον κάπου ασφαλές: χωρίς αυτόν το Vault δεν ανοίγει, ούτε από σένα ούτε από εμάς. Κράτα ένα backup του vault σε άλλο δίσκο.']],
        ['Τα αρχεία σου είναι δικά σου', ['Δεν παίρνουμε ποτέ τα αρχεία σου, τους κωδικούς σου ούτε τίποτα γι’ αυτά.']],
      ],
    }, termsEnd('RoarKit', LAB)),
  },
  {
    id: 'roardino', name: 'Roardino', page: 'lab/roardino/', what: { en: 'the call sheet in one link', el: 'το πρόγραμμα γυρίσματος σε ένα link' },
    privacy: join2({
      en: [
        ['In short', ['Roardino keeps your call sheets in your RoarMe account. A call sheet becomes public only when you publish it, and then anyone with its link can open it.']],
        ['What we keep', [
          'Your account (name, email, password as a secure hash, from RoarMe) and your Roardino profile: name, company, role and phone.',
          'Your call sheets, with what you write in them: the shoot, places, times, and the names, roles and phones of the cast and crew, and the pictures you add.',
          'When you publish, a copy of the call sheet behind a long random link, and how many times it was opened.',
        ]],
        ['Opening a call sheet', [
          'A person who opens a link sees the whole call sheet, without an account. We count the opening with a random code kept in their browser, not their name or IP.',
          'A link that starts with #o= carries the call sheet inside the address itself: it never reaches our server.',
        ]],
        ['Other services', [
          'Weather and sunrise: the place\'s coordinates and the date go to Open-Meteo. Addresses are looked up with OpenStreetMap (Nominatim). Directions open in the maps app you choose.',
          'Code and fonts load from jsDelivr and Google Fonts, so they see your IP address.',
        ]],
        ['Where it is, and who sees it', [where.en, 'The administrators of Roardino can see how many people use it and their name, company and email, to run the service. They do not read your call sheets.']],
        ['How to delete it', [`Delete a call sheet in the app; its link stops working. To delete everything, delete your RoarMe account (${ROARME_DEL.en}): your profile and call sheets go with it.`]],
      ],
      el: [
        ['Με λίγα λόγια', ['Το Roardino κρατά τα προγράμματά σου στον λογαριασμό σου στο RoarMe. Ένα πρόγραμμα γίνεται δημόσιο μόνο όταν το δημοσιεύσεις, και τότε όποιος έχει το link του μπορεί να το ανοίξει.']],
        ['Τι κρατάμε', [
          'Τον λογαριασμό σου (όνομα, email, κωδικό ως ασφαλές hash, από το RoarMe) και το προφίλ σου στο Roardino: όνομα, εταιρεία, ρόλο και τηλέφωνο.',
          'Τα προγράμματά σου, με ό,τι γράφεις μέσα: το γύρισμα, τοποθεσίες, ώρες, και τα ονόματα, τους ρόλους και τα τηλέφωνα των ηθοποιών και του συνεργείου, και τις εικόνες που βάζεις.',
          'Όταν δημοσιεύεις, ένα αντίγραφο του προγράμματος πίσω από ένα μακρύ τυχαίο link, και πόσες φορές άνοιξε.',
        ]],
        ['Όταν ανοίγει ένα πρόγραμμα', [
          'Όποιος ανοίγει ένα link βλέπει όλο το πρόγραμμα, χωρίς λογαριασμό. Μετράμε το άνοιγμα με έναν τυχαίο κωδικό που φυλάσσεται στον browser του, όχι το όνομα ή την IP του.',
          'Ένα link που ξεκινά με #o= έχει το πρόγραμμα μέσα στην ίδια τη διεύθυνση: δεν φτάνει ποτέ στον server μας.',
        ]],
        ['Άλλες υπηρεσίες', [
          'Καιρός και ανατολή: οι συντεταγμένες του τόπου και η ημερομηνία πάνε στο Open-Meteo. Οι διευθύνσεις ψάχνονται στο OpenStreetMap (Nominatim). Οι οδηγίες ανοίγουν στην εφαρμογή χαρτών που διαλέγεις.',
          'Κώδικας και γραμματοσειρές φορτώνουν από το jsDelivr και το Google Fonts, οπότε βλέπουν τη διεύθυνση IP σου.',
        ]],
        ['Πού είναι, και ποιος τα βλέπει', [where.el, 'Οι διαχειριστές του Roardino βλέπουν πόσοι το χρησιμοποιούν και το όνομα, την εταιρεία και το email τους, για να τρέχει η υπηρεσία. Δεν διαβάζουν τα προγράμματά σου.']],
        ['Πώς τα σβήνεις', [`Σβήσε ένα πρόγραμμα μέσα στην εφαρμογή· το link του σταματά να δουλεύει. Για να σβήσεις τα πάντα, διάγραψε τον λογαριασμό σου στο RoarMe (${ROARME_DEL.el}): το προφίλ και τα προγράμματά σου φεύγουν μαζί του.`]],
      ],
    }, rights(LAB)),
    terms: join2({
      en: [account.en, yours({ en: 'Your call sheets', el: 'Τα προγράμματά σου' }).en,
        ['Other people\'s details', ['A call sheet holds the names and phones of your cast and crew. Put them in only for the shoot, with their knowledge, and send the link only to the people who work on it. Anyone with a published link can see everything in it.']]],
      el: [account.el, yours({ en: 'Your call sheets', el: 'Τα προγράμματά σου' }).el,
        ['Τα στοιχεία των άλλων', ['Ένα πρόγραμμα έχει τα ονόματα και τα τηλέφωνα των ηθοποιών και του συνεργείου σου. Βάλ’ τα μόνο για το γύρισμα, εν γνώσει τους, και στείλε το link μόνο σε όσους δουλεύουν σε αυτό. Όποιος έχει ένα δημοσιευμένο link βλέπει ό,τι έχει μέσα.']]],
    }, termsEnd('Roardino', LAB)),
  },
  {
    id: 'site', name: 'themadlions.com', page: '', what: { en: 'the company site and Aibsent Studios', el: 'το site της εταιρείας και η Aibsent Studios' },
    privacy: join2({
      en: [
        ['In short', ['This covers themadlions.com, its Greek pages, Aibsent Studios (themadlions.com/aibsent) and the Lab\'s pages. We show no ads and use no cookies; we only count visits anonymously.']],
        ['The contact form', ['When you send the form we keep what you write: email, and if you give them your name, company, what you are making, budget, when you need it and your message. We use it only to answer you and to talk about the work, and keep it for as long as that takes, at most two years after our last contact. Ask us and we delete it sooner.']],
        ['Counting visits', ['The site counts, without knowing who you are, which page opened, which film played and when the form was sent, with the kind of device, the language and the site you came from. A random code kept in your browser tells one visit from another. There is no name, email or IP address in it.']],
        ['Kept in your browser', ['Your language and theme, and a copy of the site\'s films and pictures so it opens fast.']],
        ['Other services', [
          'Films play from YouTube or Vimeo when you press play; the opening video on the main page plays from YouTube (no-cookie) or Vimeo (do not track). Thumbnails load from YouTube. Under their own policies they see your IP address.',
          'Some pictures and videos load from pCloud; fonts load from Google Fonts. The site is served by GitHub Pages.',
        ]],
        ['Where it is', ['The form and the counts are stored with Supabase in London, United Kingdom (covered by the EU\'s adequacy decision for the UK). Only The Mad Lions see them.']],
      ],
      el: [
        ['Με λίγα λόγια', ['Αφορά το themadlions.com, τις ελληνικές του σελίδες, την Aibsent Studios (themadlions.com/aibsent) και τις σελίδες του Lab. Δεν δείχνουμε διαφημίσεις και δεν έχουμε cookies· μόνο μετράμε τις επισκέψεις ανώνυμα.']],
        ['Η φόρμα επικοινωνίας', ['Όταν στέλνεις τη φόρμα κρατάμε ό,τι γράφεις: email, και αν τα δώσεις όνομα, εταιρεία, τι φτιάχνεις, budget, πότε το χρειάζεσαι και το μήνυμά σου. Τα χρησιμοποιούμε μόνο για να σου απαντήσουμε και να μιλήσουμε για τη δουλειά, και τα κρατάμε όσο χρειάζεται, το πολύ δύο χρόνια μετά την τελευταία μας επαφή. Ζήτα το και τα σβήνουμε νωρίτερα.']],
        ['Μέτρηση επισκέψεων', ['Το site μετρά, χωρίς να ξέρει ποιος είσαι, ποια σελίδα άνοιξε, ποια ταινία έπαιξε και πότε στάλθηκε η φόρμα, με το είδος της συσκευής, τη γλώσσα και το site από όπου ήρθες. Ένας τυχαίος κωδικός στον browser σου ξεχωρίζει μια επίσκεψη από την άλλη. Δεν έχει όνομα, email ή διεύθυνση IP.']],
        ['Στον browser σου', ['Η γλώσσα και το θέμα σου, και ένα αντίγραφο των ταινιών και των εικόνων του site για να ανοίγει γρήγορα.']],
        ['Άλλες υπηρεσίες', [
          'Οι ταινίες παίζουν από το YouTube ή το Vimeo όταν πατάς play· το βίντεο στην αρχή της κεντρικής σελίδας παίζει από το YouTube (no-cookie) ή το Vimeo (do not track). Οι μικρογραφίες φορτώνουν από το YouTube. Με τις δικές τους πολιτικές βλέπουν τη διεύθυνση IP σου.',
          'Κάποιες εικόνες και βίντεο φορτώνουν από το pCloud· οι γραμματοσειρές από το Google Fonts. Το site σερβίρεται από το GitHub Pages.',
        ]],
        ['Πού είναι', ['Η φόρμα και οι μετρήσεις φυλάσσονται στη Supabase στο Λονδίνο (το Ηνωμένο Βασίλειο καλύπτεται από απόφαση επάρκειας της ΕΕ). Τα βλέπουν μόνο οι The Mad Lions.']],
      ],
    }, rights(INFO)),
    terms: {
      en: [
        ['The site', ['themadlions.com is the site of The Mad Lions, a film production house in Athens, Greece, and of Aibsent Studios, its post-production and AI studio.']],
        ['The films', ['The films, pictures, names and logos on the site belong to The Mad Lions and to their clients. You can watch and share their links; do not copy, edit or use them elsewhere without our written permission.']],
        ['Prices and offers', ['What the site says about services is a description, not an offer. Every job is agreed in writing, with its own price and terms.']],
        ['Law', ['These terms follow Greek law, and the courts of Athens decide any dispute, unless the law where you live as a consumer says otherwise.']],
        ['Contact', [`The Mad Lions, Athens, Greece · ${INFO}`]],
      ],
      el: [
        ['Το site', ['Το themadlions.com είναι το site των The Mad Lions, εταιρείας παραγωγής ταινιών στην Αθήνα, και της Aibsent Studios, του studio της για post-production και AI.']],
        ['Οι ταινίες', ['Οι ταινίες, οι εικόνες, τα ονόματα και τα λογότυπα στο site ανήκουν στους The Mad Lions και στους πελάτες τους. Μπορείς να τις βλέπεις και να μοιράζεσαι τα links τους· μην τις αντιγράφεις, τις επεξεργάζεσαι ή τις χρησιμοποιείς αλλού χωρίς γραπτή μας άδεια.']],
        ['Τιμές και προσφορές', ['Όσα λέει το site για τις υπηρεσίες είναι περιγραφή, όχι προσφορά. Κάθε δουλειά συμφωνείται γραπτά, με δική της τιμή και όρους.']],
        ['Δίκαιο', ['Οι όροι αυτοί διέπονται από το ελληνικό δίκαιο, και για κάθε διαφορά αρμόδια είναι τα δικαστήρια της Αθήνας, εκτός αν ο νόμος του τόπου όπου ζεις ως καταναλωτής ορίζει κάτι άλλο.']],
        ['Επικοινωνία', [`The Mad Lions, Αθήνα · ${INFO}`]],
      ],
    },
  },
]
// the two that keep their own texts
const OWN = [
  { name: 'RoarMe', what: { en: 'the messenger for teams', el: 'το messenger για ομάδες' }, privacy: 'https://alexisdigipro-hub.github.io/roarme/?legal=privacy', terms: 'https://alexisdigipro-hub.github.io/roarme/?legal=terms' },
  { name: 'RoarTransfer', what: { en: 'large files with one link', el: 'μεγάλα αρχεία με ένα link' }, privacy: 'https://roartransfer.com/privacy/', terms: 'https://roartransfer.com/terms/' },
]

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const linkify = (s) => esc(s).replace(/([a-z]+@themadlions\.com)/g, '<a href="mailto:$1">$1</a>').replace(/\b(www\.dpa\.gr)\b/g, '<a href="https://www.dpa.gr/" target="_blank" rel="noopener">$1</a>')
const doc = (d) => d.map(([h, ps]) => `<div class="tile"><h3>${esc(h)}</h3>${ps.map((p) => `<p>${linkify(p)}</p>`).join('')}</div>`).join('')

const CSS = `
:root { --bg:#16181c; --line:rgba(255,255,255,.09); --text:#eef0f3; --muted:rgba(214,220,228,.66); --dim:rgba(214,220,228,.4);
  --red:#d40000; --red-hi:#ff3b2f; --glass:rgba(255,255,255,.055); --edge:rgba(255,255,255,.12); --pad:clamp(16px,4.5vw,72px);
  --sans:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,'Helvetica Neue',sans-serif; --mono:ui-monospace,'SF Mono',Menlo,monospace; color-scheme:dark; }
* { box-sizing:border-box; }
html { background:var(--bg); scroll-behavior:smooth; }
body { margin:0; color:var(--text); font-family:var(--sans); -webkit-font-smoothing:antialiased; background:var(--bg); }
body::before { content:''; position:fixed; inset:0; z-index:-1; pointer-events:none; background:radial-gradient(1100px 620px at 50% -10%,#3c424c 0%,transparent 62%),radial-gradient(800px 600px at 100% 100%,rgba(212,0,0,.10),transparent 70%),linear-gradient(180deg,#23272e 0%,#17191d 50%,#121417 100%); }
a { color:inherit; }
:focus-visible { outline:2px solid var(--red-hi); outline-offset:3px; border-radius:8px; }
.bar { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:14px; padding:calc(12px + env(safe-area-inset-top)) var(--pad) 12px; background:rgba(22,24,28,.72); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); border-bottom:1px solid var(--line); }
.bar .home img { width:118px; height:auto; filter:invert(1); display:block; }
.bar .crumb { font-family:var(--mono); font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); text-decoration:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bar .end { margin-left:auto; display:flex; gap:8px; align-items:center; }
.seg { display:flex; padding:3px; border-radius:999px; background:var(--glass); border:1px solid var(--edge); }
.seg button, .seg a { border:0; background:transparent; cursor:pointer; padding:6px 13px; border-radius:999px; font:inherit; font-family:var(--mono); font-size:11px; letter-spacing:.08em; color:var(--muted); text-decoration:none; }
.seg .on { background:rgba(255,255,255,.14); color:var(--text); }
main { max-width:920px; margin:0 auto; padding:clamp(40px,7vw,90px) var(--pad) 40px; }
.kicker { margin:0; font-family:var(--mono); font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); }
h1 { margin:14px 0 10px; font-size:clamp(38px,7vw,72px); line-height:1; font-weight:800; letter-spacing:-.01em; }
.date { color:var(--dim); font-size:14px; margin:0 0 26px; }
.tabs { margin:0 0 34px; width:max-content; max-width:100%; }
.tabs a { font-size:12px; padding:8px 16px; }
section { scroll-margin-top:80px; }
h2 { font-size:clamp(26px,4vw,38px); margin:46px 0 18px; font-weight:700; }
section:first-of-type h2 { margin-top:0; }
.grid { display:grid; gap:12px; }
.tile { padding:20px 22px; border-radius:22px; background:var(--glass); border:1px solid var(--edge); }
.tile h3 { margin:0 0 8px; font-size:17px; }
.tile p { margin:0 0 9px; color:var(--muted); font-size:15.5px; line-height:1.6; }
.tile p:last-child { margin-bottom:0; }
.tile a { color:var(--text); }
.apps { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:12px; }
.apps .tile b { display:block; font-size:19px; margin-bottom:4px; }
.apps .tile small { display:block; color:var(--muted); font-size:14px; margin-bottom:14px; }
.pill { display:inline-flex; align-items:center; height:36px; padding:0 15px; margin:0 6px 6px 0; border-radius:999px; font-size:13.5px; font-weight:600; text-decoration:none; border:1px solid var(--edge); background:var(--glass); transition:background .2s,transform .2s; }
.pill:hover { background:rgba(255,255,255,.1); transform:translateY(-1px); }
footer { max-width:920px; margin:0 auto; padding:30px var(--pad) calc(40px + env(safe-area-inset-bottom)); color:var(--dim); font-size:13px; display:flex; gap:14px; flex-wrap:wrap; justify-content:space-between; }
footer a { color:var(--muted); text-decoration:none; }
@media (max-width:560px) { .bar .home img { width:96px; } .bar .crumb { display:none; } }
`
// the page in both languages; the switch shows one, ?lang=el or the site's saved language picks it
const shell = ({ path, title, desc, body, depth }) => {
  const up = '../'.repeat(depth)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Made by scripts/site-legal.mjs in the hub repository: edit the texts there, not here. -->
<title>${esc(title)}</title>
<link rel="canonical" href="https://themadlions.com/${path}">
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#16181c">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<style>${CSS}
html:not([lang=el]) [lang=el], html[lang=el] [lang=en] { display:none !important; }
</style>
</head>
<body>
${body(up)}
<script>
(function () {
  var q = new URLSearchParams(location.search).get('lang'), l = q
  try { if (!l) l = localStorage.getItem('tml_site_lang') } catch (e) {}
  function set(x) { l = x === 'el' ? 'el' : 'en'; document.documentElement.lang = l
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.classList.toggle('on', b.dataset.lang === l) }) }
  document.querySelectorAll('[data-lang]').forEach(function (b) { b.onclick = function () { set(b.dataset.lang); try { localStorage.setItem('tml_site_lang', l) } catch (e) {} } })
  set(l)
})()
</script>
</body>
</html>
`
}
const langSeg = '<div class="seg"><button type="button" data-lang="en">EN</button><button type="button" data-lang="el">ΕΛ</button></div>'
const both = (en, el) => `<span lang="en">${en}</span><span lang="el">${el}</span>`

for (const a of APPS) {
  const T = { en: { p: 'Privacy Policy', t: 'Terms of Use', u: 'Updated' }, el: { p: 'Πολιτική απορρήτου', t: 'Όροι χρήσης', u: 'Ενημέρωση' } }
  const body = (up) => `<header class="bar">
  <a class="home" href="${up}"><img src="${up}wordmark.png" alt="The Mad Lions"></a>
  <a class="crumb" href="${up}legal/">${both('Legal', 'Νομικά')}</a>
  <div class="end">${langSeg}</div>
</header>
<main>
  <p class="kicker">${a.page ? `<a href="${up}${a.page}" style="text-decoration:none">${esc(a.name)}</a>` : esc(a.name)} · ${both(esc(a.what.en), esc(a.what.el))}</p>
  <h1>${both('Privacy &amp; Terms', 'Απόρρητο &amp; Όροι')}</h1>
  <p class="date">${both(`${T.en.u} ${(a.updated || UPDATED).en}`, `${T.el.u} ${(a.updated || UPDATED).el}`)}</p>
  <nav class="seg tabs"><a href="#privacy">${both(T.en.p, T.el.p)}</a><a href="#terms">${both(T.en.t, T.el.t)}</a></nav>
  <section id="privacy"><h2>${both(T.en.p, T.el.p)}</h2>
    <div class="grid" lang="en">${doc(a.privacy.en)}</div><div class="grid" lang="el">${doc(a.privacy.el)}</div>
  </section>
  <section id="terms"><h2>${both(T.en.t, T.el.t)}</h2>
    <div class="grid" lang="en">${doc(a.terms.en)}</div><div class="grid" lang="el">${doc(a.terms.el)}</div>
  </section>
</main>
<footer><span>© 2026 The Mad Lions · ${esc(a.name)}</span><a href="${up}legal/">${both('Every app\'s policies', 'Οι πολιτικές όλων των εφαρμογών')}</a></footer>`
  const out = join(dir, 'legal', a.id)
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'index.html'), shell({ path: `legal/${a.id}/`, depth: 2, title: `${a.name} · Privacy Policy and Terms · The Mad Lions`,
    desc: `What ${a.name} keeps, where it goes and the terms of use, from The Mad Lions.`, body }))
}

// RoarTwin's old address (RoarTwin 0.4 and older link to it) sends on to RoarKit's, with its #privacy or #terms
mkdirSync(join(dir, 'legal', 'roartwin'), { recursive: true })
writeFileSync(join(dir, 'legal', 'roartwin', 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RoarKit · Privacy Policy and Terms · The Mad Lions</title>
<link rel="canonical" href="https://themadlions.com/legal/roarkit/">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=../roarkit/">
<script>location.replace('../roarkit/' + location.search + location.hash)</script>
<style>html { background: #16181c; color: #eef0f3; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; } a { color: inherit; }</style>
</head>
<body><p style="padding:40px">RoarTwin is now RoarKit: <a href="../roarkit/">its Privacy Policy and Terms</a>.</p></body>
</html>
`)

const tiles = [
  ...APPS.map((a) => ({ name: a.name, what: a.what, privacy: `${a.id}/#privacy`, terms: `${a.id}/#terms` })),
  ...OWN,
].sort((x, y) => (x.name === 'themadlions.com') - (y.name === 'themadlions.com'))
writeFileSync(join(dir, 'legal', 'index.html'), shell({ path: 'legal/', depth: 1, title: 'Privacy Policies and Terms · The Mad Lions',
  desc: 'The privacy policy and terms of use of every app from The Mad Lions Lab and of themadlions.com.',
  body: (up) => `<header class="bar">
  <a class="home" href="${up}"><img src="${up}wordmark.png" alt="The Mad Lions"></a>
  <a class="crumb" href="${up}lab/">The Mad Lions Lab</a>
  <div class="end">${langSeg}</div>
</header>
<main>
  <p class="kicker">The Mad Lions</p>
  <h1>${both('Privacy &amp; Terms', 'Απόρρητο &amp; Όροι')}</h1>
  <p class="date">${both('What each app keeps, where it goes, and the terms of use.', 'Τι κρατά κάθε εφαρμογή, πού πηγαίνει, και οι όροι χρήσης.')}</p>
  <div class="apps">${tiles.map((t) => `<div class="tile"><b>${esc(t.name)}</b><small>${both(esc(t.what.en), esc(t.what.el))}</small><a class="pill" href="${t.privacy}">${both('Privacy Policy', 'Απόρρητο')}</a><a class="pill" href="${t.terms}">${both('Terms', 'Όροι')}</a></div>`).join('')}</div>
</main>
<footer><span>© 2026 The Mad Lions</span><a href="mailto:${INFO}">${INFO}</a></footer>` }))
console.log(`legal: ${APPS.map((a) => a.id).join(', ')} and the list, in ${dir}/legal`)
