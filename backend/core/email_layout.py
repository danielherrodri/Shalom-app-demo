"""Email bodies in the Shalom design (emails/*.html): one structure gives the HTML and the plain text.

Presentation tables up to 600 px, inline styles, a mobile media query and a VML button for classic
Outlook, as in the design templates. Every value is escaped for HTML; links must point to the app.
No web fonts, tracking pixels, scripts or forms: the only remote resource is the logo on the app's
own domain, and its alt text keeps the header readable when images are blocked.
"""
from dataclasses import dataclass
from html import escape
from django.conf import settings

THEMES = {
    # General Shalom: Noche and Crema with copper.
    'shalom': {'bg': '#faf7f2', 'surface': '#f2ece3', 'accent': '#c8956c', 'accent_text': '#82552f', 'on_accent': '#1a1a1a',
               'soft': '#f5ebe1', 'soft_ink': '#5e3d24', 'border': '#e6ddd0', 'title': '#2d2d2d'},
    # Shalom Kids: white, fire and gold, never mixed with copper.
    'kids': {'bg': '#ffffff', 'surface': '#ffffff', 'accent': '#b84810', 'accent_text': '#8f360c', 'on_accent': '#fff0e7',
             'soft': '#fbf4e1', 'soft_ink': '#5b430f', 'border': '#eddccf', 'title': '#8f360c'},
}
LOGO_PATH = '/correo/shalom-logo.png'
FONT = 'Inter,Arial,sans-serif'


@dataclass(frozen=True)
class Email:
    """One message. Text fields may hold {placeholders}; cta_url names the value that holds the link."""
    subject: str
    theme: str
    eyebrow: str
    title: str
    intro: str
    blocks: tuple = ()
    cta: str = ''
    cta_url: str = ''
    # Shows the link itself under the button, for clients that do not render it.
    show_url: bool = False
    note: str = ''
    # Sign-off after the note, such as "¡Bendiciones!".
    closing: str = ''
    reason: str = ''


def app_url(path=''):
    return settings.PUBLIC_APP_URL.rstrip('/') + path


def checked_link(value):
    # Buttons only lead into the app; anything else is a bug, never something to send.
    base = app_url()
    if not isinstance(value, str) or not (value == base or value.startswith(base + '/') or value.startswith(base + '#')):
        raise ValueError('email link outside the app')
    return value


def render(email, **values):
    """Returns (subject, text, html) with values formatted in, escaped for the HTML part."""
    def text(field):
        return field.format(**values)
    safe = {key: escape(str(value)) for key, value in values.items()}
    def html(field):
        return escape(field).format(**safe).replace('\n', '<br>')
    link = checked_link(values[email.cta_url]) if email.cta else ''
    theme = THEMES[email.theme]

    plain = [email.title, '', text(email.intro)]
    for heading, body in email.blocks:
        plain += ['', heading, text(body)]
    if email.cta:
        plain += ['', f'{email.cta}: {link}']
    if email.note:
        plain += ['', text(email.note)]
    if email.closing:
        plain += ['', text(email.closing)]
    plain += ['', '—', text(email.reason) if email.reason else '', 'Iglesia Cristiana Shalom · Una casa para todos']

    t = theme
    blocks = ''.join(
        f'<tr><td class="px" style="padding:12px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
        f'<td style="padding:20px 24px;background:{t["surface"]};border:1px solid {t["border"]};border-radius:24px">'
        f'<h2 style="margin:0 0 8px;font:700 20px/1.3 {FONT};color:{t["accent_text"]}">{escape(heading)}</h2>'
        f'<p style="margin:0;font:400 16px/1.6 {FONT};color:#2d2d2d">{html(body)}</p></td></tr></table></td></tr>'
        for heading, body in email.blocks)
    button = ''
    if email.cta:
        href, label = escape(link), escape(email.cta)
        button = (
            f'<tr><td class="px" style="padding:24px 32px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:{t["accent"]};border-radius:999px">'
            f'<!--[if mso]><v:roundrect href="{href}" style="height:52px;v-text-anchor:middle;width:320px" arcsize="50%" stroke="f" fillcolor="{t["accent"]}">'
            f'<w:anchorlock xmlns:w="urn:schemas-microsoft-com:office:word"/><center style="color:{t["on_accent"]};font-family:Arial,sans-serif;font-size:16px;font-weight:bold">{label}</center></v:roundrect><![endif]-->'
            f'<!--[if !mso]><!--><a href="{href}" style="display:inline-block;padding:15px 24px;min-height:22px;color:{t["on_accent"]};font:700 16px/1.4 {FONT};text-decoration:none;border-radius:999px">{label}</a><!--<![endif]-->'
            f'</td></tr></table></td></tr>')
        if email.show_url:
            button += (f'<tr><td class="px" style="padding:12px 32px 0"><p style="margin:0;font:400 14px/1.6 {FONT};color:#4f4a44">Si el botón no funciona, copia este enlace en tu navegador:<br>'
                       f'<a href="{href}" style="color:{t["accent_text"]};word-break:break-all">{href}</a></p></td></tr>')
    note = (f'<tr><td class="px" style="padding:24px 32px 0"><div style="background:{t["soft"]};color:{t["soft_ink"]};border:1px solid {t["border"]};'
            f'border-radius:16px;padding:20px;font:400 14px/1.6 {FONT}">{html(email.note)}</div></td></tr>') if email.note else ''
    closing = (f'<tr><td class="px" style="padding:24px 32px 0"><p style="margin:0;font:600 16px/1.6 {FONT};color:#2d2d2d">{html(email.closing)}</p></td></tr>') if email.closing else ''
    reason = f'<p style="margin:0 0 12px;font:400 14px/1.6 {FONT};color:#4f4a44">{html(email.reason)}</p>' if email.reason else ''
    subject = text(email.subject)
    document = f'''<!doctype html>
<html lang="es-MX" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>{escape(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>body{{margin:0;padding:0}}a:focus-visible{{outline:3px solid {t["accent_text"]};outline-offset:4px}}@media(max-width:620px){{.wrap{{width:100%!important}}.px{{padding-left:24px!important;padding-right:24px!important}}.email-title{{font-size:28px!important;line-height:1.2!important}}}}</style></head>
<body style="margin:0;padding:0;background:{t["bg"]};font-family:{FONT};color:#2d2d2d">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">{html(email.intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{t["bg"]}"><tr><td align="center" style="padding:32px 12px">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td class="px" style="padding:24px 32px;background:#1a1a1a;border-radius:24px 24px 0 0"><img src="{escape(app_url(LOGO_PATH))}" alt="Shalom iglesia cristiana" width="180" style="width:180px;max-width:100%;height:auto;display:block;border:0;color:#faf7f2;font:700 18px/1.4 {FONT}"></td></tr>
<tr><td class="px" style="padding:24px 32px 0"><p style="margin:0 0 16px;color:{t["accent_text"]};font:600 13px/1.5 {FONT};letter-spacing:1.7px">{escape(email.eyebrow)}</p><h1 class="email-title" style="margin:0 0 20px;color:{t["title"]};font:800 34px/1.16 {FONT};letter-spacing:-.8px">{escape(email.title)}</h1><p style="margin:0 0 12px;font:400 16px/1.65 {FONT};color:#4f4a44">{html(email.intro)}</p></td></tr>
{blocks}{button}{note}{closing}
<tr><td style="padding:24px 0 0"></td></tr>
<tr><td class="px" style="padding:24px 32px;border-top:1px solid {t["border"]}">{reason}<p style="margin:0;font:400 14px/1.6 {FONT};color:#6b655d">Iglesia Cristiana Shalom · Una casa para todos</p></td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>'''
    return subject, '\n'.join(plain).strip() + '\n', document
