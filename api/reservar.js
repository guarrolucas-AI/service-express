import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const TALLER_EMAIL  = 'expressservice@gmail.com'; // reemplazar con el mail real del taller
const TALLER_NOMBRE = 'Express Service';
const FROM_EMAIL    = 'turnos@expressservice.com.ar'; // dominio configurado en Resend

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, apellido, tel, email, auto, notas, servicio, fecha, horario } = req.body;

  if (!nombre || !email || !servicio || !fecha || !horario) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const clienteHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
  .wrap { max-width: 560px; margin: 0 auto; background: #fff; }
  .header { background: #080808; padding: 32px 40px; }
  .header h1 { font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #fff; margin: 0; }
  .header h1 span { color: #d63020; }
  .header p { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #555; margin: 6px 0 0; }
  .topbar { height: 3px; background: #d63020; }
  .body { padding: 40px; }
  .body h2 { font-size: 22px; font-weight: 700; color: #111; margin: 0 0 8px; }
  .body .sub { font-size: 14px; color: #666; margin-bottom: 32px; line-height: 1.6; }
  .card { background: #f9f9f9; border-left: 3px solid #d63020; padding: 24px 28px; margin-bottom: 24px; }
  .card-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
  .card-row:last-child { border-bottom: none; }
  .card-key { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #999; }
  .card-val { font-size: 14px; font-weight: 600; color: #111; text-align: right; }
  .card-val.red { color: #d63020; font-size: 15px; text-transform: uppercase; }
  .wa-btn { display: block; background: #25d366; color: #fff; text-decoration: none; text-align: center; padding: 16px; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 24px 0; }
  .footer { background: #111; padding: 24px 40px; font-size: 11px; color: #555; letter-spacing: 1px; }
</style></head>
<body>
<div class="wrap">
  <div class="topbar"></div>
  <div class="header">
    <h1>Express<span>.</span>Service</h1>
    <p>Taller de Mecánica · Tren Delantero · Detailing</p>
  </div>
  <div class="body">
    <h2>Tu turno está confirmado, ${nombre}.</h2>
    <p class="sub">Recibimos tu solicitud de reserva. Te contactaremos a la brevedad para confirmar el turno. Si necesitás cambiar algo, escribinos por WhatsApp.</p>
    <div class="card">
      <div class="card-row"><span class="card-key">Servicio</span><span class="card-val red">${servicio}</span></div>
      <div class="card-row"><span class="card-key">Fecha</span><span class="card-val">${fecha}</span></div>
      <div class="card-row"><span class="card-key">Horario</span><span class="card-val">${horario} hs</span></div>
      ${auto ? `<div class="card-row"><span class="card-key">Vehículo</span><span class="card-val">${auto}</span></div>` : ''}
      <div class="card-row"><span class="card-key">Teléfono</span><span class="card-val">${tel}</span></div>
    </div>
    ${notas ? `<p style="font-size:13px;color:#666;line-height:1.6;"><strong>Notas:</strong> ${notas}</p>` : ''}
    <a class="wa-btn" href="https://wa.me/5491166614164">Confirmar por WhatsApp</a>
  </div>
  <div class="footer">© 2026 Express Service · Todos los derechos reservados</div>
</div>
</body></html>`;

  const tallerHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
  .wrap { max-width: 560px; margin: 0 auto; background: #fff; }
  .topbar { height: 3px; background: #d63020; }
  .header { background: #080808; padding: 28px 36px; color: #fff; }
  .header h1 { font-size: 16px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
  .header h1 span { color: #d63020; }
  .header p { font-size: 11px; color: #555; margin: 4px 0 0; letter-spacing: 2px; }
  .body { padding: 32px 36px; }
  .alert { background: #d63020; color: #fff; padding: 16px 20px; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; }
  td:first-child { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #999; width: 35%; }
  td:last-child { color: #111; font-weight: 500; }
  .wa-btn { display: block; background: #25d366; color: #fff; text-decoration: none; text-align: center; padding: 14px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 24px; }
</style></head>
<body>
<div class="wrap">
  <div class="topbar"></div>
  <div class="header">
    <h1>Express<span>.</span>Service</h1>
    <p>Panel de administración — Nueva reserva</p>
  </div>
  <div class="body">
    <div class="alert">⚡ Nueva solicitud de turno</div>
    <table>
      <tr><td>Servicio</td><td><strong>${servicio}</strong></td></tr>
      <tr><td>Fecha</td><td>${fecha}</td></tr>
      <tr><td>Horario</td><td>${horario} hs</td></tr>
      <tr><td>Cliente</td><td>${nombre} ${apellido}</td></tr>
      <tr><td>Teléfono</td><td>${tel}</td></tr>
      <tr><td>Email</td><td>${email}</td></tr>
      ${auto ? `<tr><td>Vehículo</td><td>${auto}</td></tr>` : ''}
      ${notas ? `<tr><td>Notas</td><td>${notas}</td></tr>` : ''}
    </table>
    <a class="wa-btn" href="https://wa.me/54${tel.replace(/\D/g,'')}">Responder por WhatsApp</a>
  </div>
</div>
</body></html>`;

  try {
    await Promise.all([
      // Mail al cliente
      resend.emails.send({
        from: `${TALLER_NOMBRE} <${FROM_EMAIL}>`,
        to: email,
        subject: `✅ Turno reservado — ${servicio} · ${fecha}`,
        html: clienteHtml,
      }),
      // Notificación al taller
      resend.emails.send({
        from: `Turnos Web <${FROM_EMAIL}>`,
        to: TALLER_EMAIL,
        subject: `⚡ Nueva reserva: ${nombre} ${apellido} — ${servicio} · ${fecha} ${horario}hs`,
        html: tallerHtml,
      }),
    ]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'No se pudo enviar el mail. Intentá por WhatsApp.' });
  }
}
