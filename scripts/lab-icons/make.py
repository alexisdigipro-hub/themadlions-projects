# one family: an off-black rounded square, one plain white line mark, a lot of air around it
M = {
 'roarme':      ('RoarMe', '<path d="M26 26h48a9 9 0 0 1 9 9v26a9 9 0 0 1-9 9H50L34 84V70h-8a9 9 0 0 1-9-9V35a9 9 0 0 1 9-9z"/>'),
 'roardino':    ('Roardino', '<circle cx="38" cy="50" r="21"/><circle cx="62" cy="50" r="21"/>'),
 'roardinoapp': ('Roardino App', '<rect x="24" y="16" width="52" height="68" rx="10"/><path d="M38 38h24M38 54h14"/>'),
 'roarmail':    ('RoarMail', '<rect x="15" y="25" width="70" height="50" rx="10"/><path d="M17 32l33 24 33-24"/>'),
 'roarlist':    ('RoarList', '<path d="M40 28h42M40 50h42M40 72h42"/><path d="M19 28h.1M19 50h.1M19 72h.1" stroke-width="11"/>'),
 'roartransfer':('RoarTransfer', '<path d="M50 84V22M28 44l22-22 22 22"/>'),
 'roarstudio':  ('RoarTransfer Studio', '<rect x="14" y="22" width="72" height="56" rx="12"/><path d="M42 38v24l19-12z"/>'),
 'roarwriter':  ('RoarWriter', '<path d="M50 14l21 32-15 38H44L29 46z"/><path d="M50 50v34"/>'),
 'roarkit':     ('RoarKit', '<rect x="15" y="36" width="70" height="46" rx="10"/><path d="M37 36v-7a8 8 0 0 1 8-8h10a8 8 0 0 1 8 8v7"/>'),
 'roarmorph':   ('RoarMorph', '<rect x="15" y="15" width="44" height="44" rx="10"/><circle cx="60" cy="60" r="25"/>'),
 'roarplay':    ('RoarPlay', '<path d="M30 22v56a4 4 0 0 0 6 3.4l46-28a4 4 0 0 0 0-6.8l-46-28A4 4 0 0 0 30 22z"/>'),
 'roarref':     ('RoarRef', '<rect x="14" y="20" width="20" height="60" rx="7"/><rect x="40" y="20" width="20" height="60" rx="7"/><rect x="66" y="20" width="20" height="60" rx="7"/>'),
 'roarcast':    ('RoarCast', '<rect x="16" y="16" width="29" height="29" rx="8"/><rect x="55" y="16" width="29" height="29" rx="8"/><rect x="16" y="55" width="29" height="29" rx="8"/><rect x="55" y="55" width="29" height="29" rx="8"/>'),
 'roarmind':    ('RoarMind', '<circle cx="44" cy="44" r="27"/><path d="M64 64l21 21"/>'),
 'roargrab':    ('RoarGrab', '<path d="M50 14v46M32 44l18 18 18-18"/><path d="M18 84h64"/>'),
}
def svg(k, r=22):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="{r}" fill="#0e0e10"/><g transform="translate(50 50) scale(.6) translate(-50 -50)" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">{M[k][1]}</g></svg>\n'
for k in M: open(k+'.svg','w').write(svg(k))
cells=''.join(f'<figure><div>{svg(k)}</div><div class="s">{svg(k)}</div><figcaption>{M[k][0]}</figcaption></figure>' for k in M)
open('sheet.html','w').write(f'<!doctype html><meta charset="utf-8"><body style="margin:0;background:#2a2d33;font:500 15px -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#e8e8e8"><style>main{{display:grid;grid-template-columns:repeat(5,1fr);gap:34px 26px;padding:40px}}figure{{margin:0;display:grid;justify-items:center;gap:10px;position:relative}}figure>div:first-child svg{{width:150px;height:150px;display:block}}.s{{position:absolute;right:8px;top:118px}}.s svg{{width:34px;height:34px;display:block;box-shadow:0 0 0 2px #2a2d33;border-radius:8px}}</style><main>{cells}</main>')
