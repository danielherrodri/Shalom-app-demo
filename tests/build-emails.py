from pathlib import Path
import json,html
root=Path(__file__).resolve().parent.parent
items=json.loads((root/'emails/catalogo.json').read_text(encoding='utf-8-sig'))
esc=html.escape
for item in items:
 kids=item['theme']=='Kids';bg='#ffffff' if kids else '#faf7f2';surface='#ffffff' if kids else '#f2ece3';accent='#b84810' if kids else '#c8956c';accenttext='#8f360c' if kids else '#82552f';on='#fff0e7' if kids else '#1a1a1a';soft='#fbf4e1' if kids else '#f5ebe1';softink='#5b430f' if kids else '#5e3d24';border='#eddccf' if kids else '#e6ddd0'
 blocks=''.join('<tr><td class="px" style="padding:12px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:20px 24px;background:'+surface+';border:1px solid '+border+';border-radius:24px"><h2 style="margin:0 0 8px;font:700 20px/1.3 Inter,Arial,sans-serif;color:'+accenttext+'">'+esc(title)+'</h2><p style="margin:0;font:400 16px/1.6 Inter,Arial,sans-serif;color:#2d2d2d">'+esc(body).replace('\n','<br>')+'</p></td></tr></table></td></tr>' for title,body in item['blocks'])
 opt=item['type']=='Optativo'
 controls='<a href="../comunicaciones.html#preferencias" style="color:'+accenttext+';display:inline-block;min-height:44px;padding:8px 0">Elegir preferencias</a>'
 if opt:controls+=' &nbsp;·&nbsp; <a href="../comunicaciones.html#preferencias" style="color:'+accenttext+';display:inline-block;min-height:44px;padding:8px 0">Baja de ejemplo</a>'
 controls+='<br><a href="../comunicaciones.html#privacidad" style="color:'+accenttext+';display:inline-block;min-height:44px;padding:8px 0">Privacidad</a>'
 source='''<!doctype html>
<html lang="es-MX" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>'''+esc(item['subject'])+''' · Demo</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>@font-face{font-family:Inter;src:url(../assets/Inter-latin.woff2) format("woff2");font-weight:100 900;font-display:swap}body{margin:0;padding:0}a:focus-visible{outline:3px solid '''+accenttext+''';outline-offset:4px}@media(max-width:620px){.wrap{width:100%!important}.px{padding-left:24px!important;padding-right:24px!important}.email-title{font-size:28px!important;line-height:1.2!important}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}</style></head>
<body style="margin:0;padding:0;background:'''+bg+''';font-family:Inter,Arial,sans-serif;color:#2d2d2d">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">'''+esc(item['subject'])+''' · Vista de demostración. No se envió ningún correo.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:'''+bg+'''"><tr><td align="center" style="padding:32px 12px">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td class="px" style="padding:24px 32px;background:#1a1a1a;border-radius:24px 24px 0 0"><img src="../assets/shalom-logo.png" alt="Shalom iglesia cristiana" width="180" style="width:180px;max-width:100%;height:auto;display:block;border:0"><p style="margin:18px 0 0;color:#faf7f2;font:600 12px/1.5 Inter,Arial,sans-serif;letter-spacing:1.5px">DEMOSTRACIÓN · SIN ENVÍO</p></td></tr>
<tr><td class="px" style="padding:24px 32px 0"><p style="margin:0 0 16px;color:'''+accenttext+''';font:600 13px/1.5 Inter,Arial,sans-serif;letter-spacing:1.7px">'''+esc(item['eyebrow'])+'''</p><h1 class="email-title" style="margin:0 0 20px;color:'''+('#8f360c' if kids else '#2d2d2d')+''';font:800 34px/1.16 Inter,Arial,sans-serif;letter-spacing:-.8px">'''+esc(item['title'])+'''</h1><p style="margin:0 0 12px;font:400 16px/1.65 Inter,Arial,sans-serif;color:#4f4a44">'''+esc(item['intro'])+'''</p></td></tr>
'''+blocks+'''
<tr><td class="px" style="padding:24px 32px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:'''+accent+''';border-radius:999px">
<!--[if mso]><v:roundrect href="'''+esc(item['href'])+'''" style="height:52px;v-text-anchor:middle;width:320px" arcsize="50%" stroke="f" fillcolor="'''+accent+'''"><w:anchorlock xmlns:w="urn:schemas-microsoft-com:office:word"/><center style="color:'''+on+''';font-family:Arial,sans-serif;font-size:16px;font-weight:bold">'''+esc(item['cta'])+'''</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="'''+esc(item['href'])+'''" style="display:inline-block;padding:15px 24px;min-height:22px;color:'''+on+''';font:700 16px/1.4 Inter,Arial,sans-serif;text-decoration:none;border-radius:999px">'''+esc(item['cta'])+'''</a><!--<![endif]--></td></tr></table></td></tr>
<tr><td class="px" style="padding:0 32px 24px"><div style="background:'''+soft+''';color:'''+softink+''';border:1px solid '''+border+''';border-radius:16px;padding:20px;font:400 14px/1.6 Inter,Arial,sans-serif">'''+esc(item['note'])+'''</div></td></tr>
<tr><td class="px" style="padding:24px 32px;border-top:1px solid '''+border+'''"><p style="margin:0 0 12px;font:400 14px/1.6 Inter,Arial,sans-serif;color:#4f4a44">'''+esc(item['reason'])+'''</p><p style="margin:0;font:400 14px/1.6 Inter,Arial,sans-serif">'''+controls+'''</p><p style="margin:16px 0 0;font:400 14px/1.6 Inter,Arial,sans-serif;color:#6b655d">Iglesia Cristiana Shalom · Una casa para todos<br>Plantilla editable · [responsable y contacto de producción]</p></td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>'''
 (root/'emails'/f"{item['id']}.html").write_text(source,encoding='utf-8')
 (root/'emails'/f"{item['id']}.txt").write_text(item['subject']+'\n\nDEMOSTRACIÓN · SIN ENVÍO\n\n'+item['intro']+'\n\n'+'\n\n'.join(t+'\n'+b for t,b in item['blocks'])+'\n\n'+item['note']+'\n\n'+item['reason']+'\nPreferencias y privacidad: [enlaces de producción]\n',encoding='utf-8')
(root/'assets/email-catalog.js').write_text('window.ShalomEmailCatalog='+json.dumps([{k:v for k,v in i.items() if k in ['id','theme','type','subject','title']} for i in items],ensure_ascii=False)+';\n',encoding='utf-8')
print('8 plantillas HTML y texto generadas desde catalogo.json')
