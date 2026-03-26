const { Op } = require('sequelize');
const { ChairSession, Patient, Chair, Medication, SessionMedication } = require('../models');

// Crea el transporter de nodemailer solo si SMTP está configurado
const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
};

// Transforma las sesiones en la estructura del reporte
const buildReportData = (sessions, startDate, endDate) => {
  const pacientesMap = {};
  const sillonesMap = {};
  const medicamentosMap = {};

  sessions.forEach(session => {
    const patient = session.Patient;
    const chair = session.Chair;
    const meds = session.SessionMedications || [];

    const duracionSegundos = session.horaFin
      ? Math.round((new Date(session.horaFin) - new Date(session.horaInicio)) / 1000)
      : null;

    const medicamentosSesion = meds.map(sm => {
      const precio = sm.precioUnitario || sm.Medication?.precio || 0;
      return {
        nombre: sm.Medication?.nombre || 'Desconocido',
        unidad: sm.Medication?.unidad || 'unidad',
        cantidad: sm.cantidadAdministrada,
        precioUnitario: precio,
        subtotal: sm.cantidadAdministrada * precio
      };
    });

    const totalSesion = medicamentosSesion.reduce((sum, m) => sum + m.subtotal, 0);

    // Acumular por paciente
    if (patient) {
      if (!pacientesMap[patient.id]) {
        pacientesMap[patient.id] = {
          id: patient.id,
          nombreCompleto: patient.nombreCompleto,
          rut: patient.rut,
          pasaporte: patient.pasaporte,
          prevision: patient.prevision,
          correo: patient.correo,
          telefono: patient.telefono,
          sesiones: [],
          totalPaciente: 0
        };
      }
      pacientesMap[patient.id].sesiones.push({
        sessionId: session.id,
        estado: session.estado,
        sillon: chair?.nombre || 'Sin sillón',
        horaInicio: session.horaInicio,
        horaFin: session.horaFin,
        duracionSegundos,
        notas: session.notas,
        medicamentos: medicamentosSesion,
        totalSesion
      });
      pacientesMap[patient.id].totalPaciente += totalSesion;
    }

    // Acumular por sillón
    if (chair) {
      if (!sillonesMap[chair.id]) {
        sillonesMap[chair.id] = {
          id: chair.id, numero: chair.numero, nombre: chair.nombre,
          ubicacion: chair.ubicacion, totalSesiones: 0, segundosTotales: 0
        };
      }
      sillonesMap[chair.id].totalSesiones++;
      sillonesMap[chair.id].segundosTotales += (duracionSegundos || 0);
    }

    // Acumular por medicamento
    meds.forEach(sm => {
      const med = sm.Medication;
      if (med) {
        const precio = sm.precioUnitario || med.precio || 0;
        if (!medicamentosMap[med.id]) {
          medicamentosMap[med.id] = {
            id: med.id, nombre: med.nombre, unidad: med.unidad,
            cantidadTotal: 0, costoTotal: 0
          };
        }
        medicamentosMap[med.id].cantidadTotal += sm.cantidadAdministrada;
        medicamentosMap[med.id].costoTotal += sm.cantidadAdministrada * precio;
      }
    });
  });

  const pacientes = Object.values(pacientesMap);
  const costoTotal = pacientes.reduce((sum, p) => sum + p.totalPaciente, 0);

  return {
    periodo: { desde: startDate, hasta: endDate },
    resumen: {
      totalPacientes: pacientes.length,
      totalSesiones: sessions.length,
      costoTotal
    },
    pacientes,
    sillones: Object.values(sillonesMap),
    medicamentos: Object.values(medicamentosMap)
  };
};

// Incluye relaciones completas para las consultas de reporte
const reportIncludes = [
  { model: Patient, attributes: ['id', 'nombreCompleto', 'rut', 'pasaporte', 'prevision', 'correo', 'telefono'] },
  { model: Chair, attributes: ['id', 'numero', 'nombre', 'ubicacion'] },
  {
    model: SessionMedication,
    include: [{ model: Medication, attributes: ['id', 'nombre', 'unidad', 'precio'] }]
  }
];

const reportController = {

  // GET /api/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  getReport: async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren startDate y endDate (YYYY-MM-DD)'
        });
      }

      const sessions = await ChairSession.findAll({
        where: {
          horaInicio: {
            [Op.gte]: new Date(startDate + 'T00:00:00'),
            [Op.lte]: new Date(endDate + 'T23:59:59')
          }
        },
        include: reportIncludes,
        order: [['horaInicio', 'ASC']]
      });

      return res.json({ success: true, data: buildReportData(sessions, startDate, endDate) });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/reports/patient/:id?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  getPatientReport: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const patient = await Patient.findByPk(id);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
      }

      const where = { patientId: id };
      if (startDate && endDate) {
        where.horaInicio = {
          [Op.gte]: new Date(startDate + 'T00:00:00'),
          [Op.lte]: new Date(endDate + 'T23:59:59')
        };
      }

      const sessions = await ChairSession.findAll({
        where,
        include: [
          { model: Chair, attributes: ['id', 'numero', 'nombre'] },
          {
            model: SessionMedication,
            include: [{ model: Medication, attributes: ['id', 'nombre', 'unidad', 'precio'] }]
          }
        ],
        order: [['horaInicio', 'DESC']]
      });

      const sesiones = sessions.map(session => {
        const duracionSegundos = session.horaFin
          ? Math.round((new Date(session.horaFin) - new Date(session.horaInicio)) / 1000)
          : null;
        const medicamentos = (session.SessionMedications || []).map(sm => {
          const precio = sm.precioUnitario || sm.Medication?.precio || 0;
          return {
            nombre: sm.Medication?.nombre || 'Desconocido',
            unidad: sm.Medication?.unidad || 'unidad',
            cantidad: sm.cantidadAdministrada,
            precioUnitario: precio,
            subtotal: sm.cantidadAdministrada * precio
          };
        });
        return {
          sessionId: session.id,
          estado: session.estado,
          sillon: session.Chair?.nombre || 'Sin sillón',
          horaInicio: session.horaInicio,
          horaFin: session.horaFin,
          duracionSegundos,
          notas: session.notas,
          medicamentos,
          totalSesion: medicamentos.reduce((sum, m) => sum + m.subtotal, 0)
        };
      });

      return res.json({
        success: true,
        data: {
          paciente: {
            id: patient.id,
            nombreCompleto: patient.nombreCompleto,
            rut: patient.rut,
            pasaporte: patient.pasaporte,
            fechaNacimiento: patient.fechaNacimiento,
            prevision: patient.prevision,
            correo: patient.correo,
            telefono: patient.telefono,
            direccion: patient.direccion
          },
          periodo: startDate && endDate ? { desde: startDate, hasta: endDate } : null,
          sesiones,
          costoTotal: sesiones.reduce((sum, s) => sum + s.totalSesion, 0)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/reports/email
  sendEmail: async (req, res, next) => {
    try {
      const { recipientEmail, subject, startDate, endDate, reportData } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ success: false, message: 'Se requiere recipientEmail' });
      }

      const transporter = createTransporter();
      if (!transporter) {
        return res.status(503).json({
          success: false,
          message: 'Email no configurado. Defina SMTP_HOST, SMTP_USER y SMTP_PASS en el archivo .env del backend.'
        });
      }

      const htmlContent = buildEmailHTML(reportData, startDate, endDate);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipientEmail,
        subject: subject || `Reporte CDIEM — ${startDate} al ${endDate}`,
        html: htmlContent
      });

      return res.json({ success: true, message: `Reporte enviado a ${recipientEmail}` });
    } catch (err) {
      if (err.code === 'ECONNECTION' || err.code === 'EAUTH') {
        return res.status(503).json({
          success: false,
          message: 'Error de conexión SMTP. Verifique las variables SMTP_* en el .env'
        });
      }
      next(err);
    }
  }
};

// Genera el HTML del reporte para el email
function buildEmailHTML(data, startDate, endDate) {
  const clp = n => `$${(n || 0).toLocaleString('es-CL')}`;

  const pacientesRows = (data?.pacientes || []).map(p => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${p.nombreCompleto}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${p.rut || p.pasaporte || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${p.sesiones?.length || 0}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${clp(p.totalPaciente)}</td>
    </tr>`).join('');

  const medicamentosRows = (data?.medicamentos || []).map(m => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${m.nombre}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${m.cantidadTotal} ${m.unidad}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${clp(m.costoTotal)}</td>
    </tr>`).join('');

  const sillonesRows = (data?.sillones || []).map(s => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${s.nombre}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${s.totalSesiones}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${s.minutosTotales} min</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;color:#333;max-width:800px;margin:0 auto;padding:20px">
    <h1 style="color:#1976d2;border-bottom:2px solid #1976d2;padding-bottom:10px">
      Reporte CDIEM — Centro Oncológico
    </h1>
    <p><strong>Período:</strong> ${startDate} al ${endDate} &nbsp;|&nbsp;
       <strong>Generado:</strong> ${new Date().toLocaleString('es-CL')}</p>

    <div style="display:flex;gap:15px;margin:20px 0">
      <div style="background:#e3f2fd;padding:15px;border-radius:8px;flex:1;text-align:center">
        <div style="font-size:28px;color:#1976d2;font-weight:bold">${data?.resumen?.totalPacientes || 0}</div>
        <div>Pacientes</div>
      </div>
      <div style="background:#e8f5e9;padding:15px;border-radius:8px;flex:1;text-align:center">
        <div style="font-size:28px;color:#2e7d32;font-weight:bold">${data?.resumen?.totalSesiones || 0}</div>
        <div>Sesiones</div>
      </div>
      <div style="background:#fff3e0;padding:15px;border-radius:8px;flex:1;text-align:center">
        <div style="font-size:28px;color:#e65100;font-weight:bold">${clp(data?.resumen?.costoTotal)}</div>
        <div>Costo Total</div>
      </div>
    </div>

    <h2 style="color:#555">Pacientes Atendidos</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#1976d2;color:white">
        <th style="padding:10px;text-align:left">Paciente</th>
        <th style="padding:10px;text-align:left">RUT/Pasaporte</th>
        <th style="padding:10px;text-align:center">Sesiones</th>
        <th style="padding:10px;text-align:right">Total</th>
      </tr></thead>
      <tbody>${pacientesRows || '<tr><td colspan="4" style="padding:8px;text-align:center;color:#999">Sin datos</td></tr>'}</tbody>
    </table>

    <h2 style="color:#555;margin-top:30px">Medicamentos Utilizados</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#2e7d32;color:white">
        <th style="padding:10px;text-align:left">Medicamento</th>
        <th style="padding:10px;text-align:center">Cantidad</th>
        <th style="padding:10px;text-align:right">Costo Total</th>
      </tr></thead>
      <tbody>${medicamentosRows || '<tr><td colspan="3" style="padding:8px;text-align:center;color:#999">Sin datos</td></tr>'}</tbody>
    </table>

    <h2 style="color:#555;margin-top:30px">Uso de Sillones</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#546e7a;color:white">
        <th style="padding:10px;text-align:left">Sillón</th>
        <th style="padding:10px;text-align:center">Sesiones</th>
        <th style="padding:10px;text-align:center">Tiempo Total</th>
      </tr></thead>
      <tbody>${sillonesRows || '<tr><td colspan="3" style="padding:8px;text-align:center;color:#999">Sin datos</td></tr>'}</tbody>
    </table>

    <p style="margin-top:30px;color:#999;font-size:12px">
      Este reporte fue generado automáticamente por el Sistema CDIEM
    </p>
  </body></html>`;
}

module.exports = reportController;
