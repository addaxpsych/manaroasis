/**
 * Arabic RTL email templates.
 *
 * Written as inline-styled HTML strings because mail clients strip <style>
 * blocks and ignore external CSS. `dir="rtl"` plus explicit `text-align:right`
 * is needed — Gmail and Outlook do not inherit direction reliably.
 */
import { site, waLink } from '../../config/site';

const GREEN = '#1b3d30';
const SAND = '#f7efe1';
const GOLD = '#c1913f';
const INK = '#2b241c';
const INK_SOFT = '#6b5b4a';

function shell(bodyHtml: string, preheader: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${SAND};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SAND};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border:1px solid #e5d1ac;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:${GREEN};padding:22px 28px;text-align:right;">
            <div style="font-family:Tahoma,Arial,sans-serif;font-size:17px;font-weight:bold;color:${SAND};">
              ${site.name}
            </div>
            <div style="font-family:Tahoma,Arial,sans-serif;font-size:12px;color:#c9b998;padding-top:4px;">
              ${site.tagline}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;text-align:right;direction:rtl;
                     font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.9;color:${INK};">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#faf6ef;border-top:1px solid #e5d1ac;padding:18px 28px;text-align:right;
                     font-family:Tahoma,Arial,sans-serif;font-size:12px;line-height:1.8;color:${INK_SOFT};">
            <div>واتساب: <a href="${waLink()}" style="color:${GREEN};">${site.whatsapp}</a></div>
            <div>هاتف: <span dir="ltr">${site.phone}</span></div>
            <div style="padding-top:6px;color:#9a8a78;">واحة المعادي &nbsp;·&nbsp; واحة الرحاب</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
    <tr><td style="background:${GREEN};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:12px 26px;font-family:Tahoma,Arial,sans-serif;
         font-size:14px;font-weight:bold;color:${SAND};text-decoration:none;">${label}</a>
    </td></tr>
  </table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 14px;font-family:Tahoma,Arial,sans-serif;font-size:20px;
    font-weight:bold;color:${GREEN};line-height:1.5;">${text}</h1>`;
}

function rule(): string {
  return `<div style="height:1px;background:${GOLD};opacity:0.35;margin:20px 0;"></div>`;
}

/** Sent to the customer the moment they submit an enrollment request. */
export function requestReceived(input: {
  name: string;
  courseTitle: string;
}): { subject: string; html: string } {
  return {
    subject: `تم استلام طلبك — ${input.courseTitle}`,
    html: shell(
      `${heading('وصلنا طلبك 🌿')}
       <p style="margin:0 0 12px;">أهلاً ${escapeHtml(input.name)}،</p>
       <p style="margin:0 0 12px;">
         استلمنا طلب التحاقك بـ<strong>${escapeHtml(input.courseTitle)}</strong>، وهنتواصل معاكِ
         خلال يوم عمل واحد لتأكيد الحجز وطريقة الدفع.
       </p>
       ${rule()}
       <p style="margin:0 0 8px;font-weight:bold;color:${GREEN};">لو حابة تستعجلي الأمر</p>
       <p style="margin:0 0 12px;">تقدري تكلمينا على واتساب مباشرة وهنكمل معاكِ من هناك.</p>
       ${button(waLink(`السلام عليكم، حابة أكمل حجز ${input.courseTitle}`), 'تواصلي على واتساب')}
       <p style="margin:0;color:${INK_SOFT};font-size:13px;">
         لو الطلب ده مش منك، تجاهلي الرسالة ومش هيتم أي إجراء.
       </p>`,
      `استلمنا طلب التحاقك بـ${input.courseTitle}`,
    ),
  };
}

/** Sent to the clinic so a request never sits unseen in a dashboard. */
export function requestAlert(input: {
  name: string;
  phone: string;
  email: string;
  city?: string | null;
  notes?: string | null;
  courseTitle: string;
  adminUrl: string;
}): { subject: string; html: string } {
  const row = (label: string, value: string) =>
    `<tr>
       <td style="padding:6px 0;color:${INK_SOFT};width:90px;">${label}</td>
       <td style="padding:6px 0;font-weight:bold;">${value}</td>
     </tr>`;

  return {
    subject: `طلب التحاق جديد: ${input.courseTitle} — ${input.name}`,
    html: shell(
      `${heading('طلب التحاق جديد')}
       <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
         ${row('الاسم', escapeHtml(input.name))}
         ${row('الهاتف', `<a href="tel:${escapeHtml(input.phone)}" style="color:${GREEN};" dir="ltr">${escapeHtml(input.phone)}</a>`)}
         ${row('البريد', `<a href="mailto:${escapeHtml(input.email)}" style="color:${GREEN};" dir="ltr">${escapeHtml(input.email)}</a>`)}
         ${input.city ? row('المدينة', escapeHtml(input.city)) : ''}
         ${row('الكورس', escapeHtml(input.courseTitle))}
       </table>
       ${input.notes ? `${rule()}<p style="margin:0;color:${INK_SOFT};">${escapeHtml(input.notes)}</p>` : ''}
       ${button(waLink(`السلام عليكم ${input.name}، بخصوص طلب التحاقك بـ${input.courseTitle}`), 'ردي على واتساب')}
       <p style="margin:0;font-size:13px;">
         <a href="${input.adminUrl}" style="color:${GREEN};">فتح لوحة التحكم</a>
       </p>`,
      `${input.name} — ${input.phone}`,
    ),
  };
}

/** Sent when the admin confirms payment and activates the enrollment. */
export function enrollmentActivated(input: {
  name: string;
  courseTitle: string;
  loginUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `تم تفعيل ${input.courseTitle} 🎉`,
    html: shell(
      `${heading('تم تفعيل الكورس')}
       <p style="margin:0 0 12px;">مبروك ${escapeHtml(input.name)}،</p>
       <p style="margin:0 0 12px;">
         تم تفعيل اشتراكك في <strong>${escapeHtml(input.courseTitle)}</strong>.
         تقدري تدخلي دلوقتي وتبدأي أول درس، والتقدم بيتحفظ تلقائياً عشان تكملي في أي وقت.
       </p>
       ${button(input.loginUrl, 'ابدئي الكورس')}
       <p style="margin:0;color:${INK_SOFT};font-size:13px;">
         لو واجهتك أي مشكلة في الدخول، كلمينا على واتساب وهنساعدك فوراً.
       </p>`,
      `تم تفعيل ${input.courseTitle}`,
    ),
  };
}

/** Confirmation for the general contact form. */
export function contactReceived(input: { name: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: 'وصلتنا رسالتك',
    html: shell(
      `${heading('وصلتنا رسالتك')}
       <p style="margin:0 0 12px;">أهلاً ${escapeHtml(input.name)}،</p>
       <p style="margin:0 0 12px;">
         شكراً لتواصلك مع الواحة. هنرد عليكِ في أقرب وقت خلال ساعات العمل.
       </p>
       <p style="margin:0 0 12px;">لو الموضوع مستعجل، واتساب أسرع وسيلة للوصول لنا.</p>
       ${button(waLink('السلام عليكم، عندي استفسار'), 'تواصلي على واتساب')}`,
      'وصلتنا رسالتك وهنرد قريباً',
    ),
  };
}

/** Contact form notification to the clinic. */
export function contactAlert(input: {
  name: string;
  phone: string;
  email?: string | null;
  subject?: string | null;
  message: string;
}): { subject: string; html: string } {
  return {
    subject: `رسالة جديدة من ${input.name}`,
    html: shell(
      `${heading('رسالة جديدة من الموقع')}
       <p style="margin:0 0 6px;"><strong>${escapeHtml(input.name)}</strong></p>
       <p style="margin:0 0 6px;" dir="ltr">${escapeHtml(input.phone)}</p>
       ${input.email ? `<p style="margin:0 0 6px;" dir="ltr">${escapeHtml(input.email)}</p>` : ''}
       ${input.subject ? `<p style="margin:0 0 6px;color:${INK_SOFT};">${escapeHtml(input.subject)}</p>` : ''}
       ${rule()}
       <p style="margin:0;white-space:pre-wrap;">${escapeHtml(input.message)}</p>
       ${button(waLink(`السلام عليكم ${input.name}`), 'ردي على واتساب')}`,
      escapeHtml(input.message).slice(0, 90),
    ),
  };
}

/**
 * Escapes user-supplied text before it goes into an HTML email. Names and
 * notes come straight from a public form, so this is required — not defensive
 * decoration.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
